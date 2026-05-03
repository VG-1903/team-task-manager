const prisma = require('../config/db');

// GET /api/dashboard — aggregated view across all of the user's projects
async function dashboard(req, res) {
  const userId = req.user.id;
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true, role: true },
  });
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    return res.json({
      summary: { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0, assignedToMe: 0 },
      tasks: { assignedToMe: [], overdue: [], dueSoon: [], recentlyCompleted: [] },
      projectCount: 0,
    });
  }

  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [statusCounts, assignedToMeCount, overdueCount, assignedToMe, overdue, dueSoon, recentlyCompleted] =
    await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      prisma.task.count({ where: { projectId: { in: projectIds }, assigneeId: userId, status: { not: 'DONE' } } }),
      prisma.task.count({
        where: {
          projectId: { in: projectIds },
          dueDate: { lt: now },
          status: { not: 'DONE' },
        },
      }),
      prisma.task.findMany({
        where: { projectId: { in: projectIds }, assigneeId: userId, status: { not: 'DONE' } },
        include: { project: { select: { id: true, name: true } } },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          dueDate: { lt: now },
          status: { not: 'DONE' },
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          dueDate: { gte: now, lte: sevenDays },
          status: { not: 'DONE' },
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.task.findMany({
        where: { projectId: { in: projectIds }, status: 'DONE' },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

  const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const row of statusCounts) counts[row.status] = row._count._all;

  res.json({
    summary: {
      total: counts.TODO + counts.IN_PROGRESS + counts.DONE,
      todo: counts.TODO,
      inProgress: counts.IN_PROGRESS,
      done: counts.DONE,
      overdue: overdueCount,
      assignedToMe: assignedToMeCount,
    },
    tasks: {
      assignedToMe,
      overdue,
      dueSoon,
      recentlyCompleted,
    },
    projectCount: projectIds.length,
  });
}

module.exports = { dashboard };
