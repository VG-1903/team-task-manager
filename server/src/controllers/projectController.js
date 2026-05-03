const { z } = require('zod');
const prisma = require('../config/db');
const HttpError = require('../utils/httpError');

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

// GET /api/projects — projects current user belongs to
async function listProjects(req, res) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    include: {
      project: {
        include: {
          _count: { select: { tasks: true, members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });
  const projects = memberships.map((m) => ({
    id: m.project.id,
    name: m.project.name,
    description: m.project.description,
    role: m.role,
    taskCount: m.project._count.tasks,
    memberCount: m.project._count.members,
    createdAt: m.project.createdAt,
  }));
  res.json({ projects });
}

// POST /api/projects — creator becomes ADMIN
async function createProject(req, res) {
  const data = createProjectSchema.parse(req.body);
  const project = await prisma.project.create({
    data: {
      name: data.name.trim(),
      description: data.description ?? null,
      ownerId: req.user.id,
      members: {
        create: { userId: req.user.id, role: 'ADMIN' },
      },
    },
    include: { _count: { select: { tasks: true, members: true } } },
  });
  res.status(201).json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      role: 'ADMIN',
      taskCount: 0,
      memberCount: 1,
      createdAt: project.createdAt,
    },
  });
}

// GET /api/projects/:id
async function getProject(req, res) {
  const members = await prisma.projectMember.findMany({
    where: { projectId: req.project.id },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  res.json({
    project: {
      id: req.project.id,
      name: req.project.name,
      description: req.project.description,
      ownerId: req.project.ownerId,
      role: req.projectRole,
      createdAt: req.project.createdAt,
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    },
  });
}

// PATCH /api/projects/:id — admin only
async function updateProject(req, res) {
  const data = updateProjectSchema.parse(req.body);
  const project = await prisma.project.update({
    where: { id: req.project.id },
    data,
  });
  res.json({ project });
}

// DELETE /api/projects/:id — admin only
async function deleteProject(req, res) {
  await prisma.project.delete({ where: { id: req.project.id } });
  res.status(204).end();
}

// POST /api/projects/:id/members — admin only, invite by email
async function addMember(req, res) {
  const data = inviteSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (!user) throw new HttpError(404, 'No user with that email — they must sign up first');

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: req.project.id, userId: user.id } },
  });
  if (existing) throw new HttpError(409, 'User is already a member of this project');

  const member = await prisma.projectMember.create({
    data: { projectId: req.project.id, userId: user.id, role: data.role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  res.status(201).json({
    member: {
      id: member.id,
      userId: member.user.id,
      email: member.user.email,
      name: member.user.name,
      role: member.role,
      joinedAt: member.joinedAt,
    },
  });
}

// PATCH /api/projects/:id/members/:memberId — admin only, change role
async function updateMemberRole(req, res) {
  const data = updateMemberRoleSchema.parse(req.body);
  const member = await prisma.projectMember.findUnique({ where: { id: req.params.memberId } });
  if (!member || member.projectId !== req.project.id) {
    throw new HttpError(404, 'Member not found');
  }
  // Don't let an admin demote the last remaining admin
  if (member.role === 'ADMIN' && data.role !== 'ADMIN') {
    const adminCount = await prisma.projectMember.count({
      where: { projectId: req.project.id, role: 'ADMIN' },
    });
    if (adminCount <= 1) throw new HttpError(400, 'Cannot demote the last admin');
  }
  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { role: data.role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  res.json({
    member: {
      id: updated.id,
      userId: updated.user.id,
      email: updated.user.email,
      name: updated.user.name,
      role: updated.role,
      joinedAt: updated.joinedAt,
    },
  });
}

// DELETE /api/projects/:id/members/:memberId — admin only
async function removeMember(req, res) {
  const member = await prisma.projectMember.findUnique({ where: { id: req.params.memberId } });
  if (!member || member.projectId !== req.project.id) {
    throw new HttpError(404, 'Member not found');
  }
  if (member.userId === req.project.ownerId) {
    throw new HttpError(400, 'Cannot remove the project owner');
  }
  if (member.role === 'ADMIN') {
    const adminCount = await prisma.projectMember.count({
      where: { projectId: req.project.id, role: 'ADMIN' },
    });
    if (adminCount <= 1) throw new HttpError(400, 'Cannot remove the last admin');
  }
  await prisma.projectMember.delete({ where: { id: member.id } });
  res.status(204).end();
}

module.exports = {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  updateMemberRole,
  removeMember,
};
