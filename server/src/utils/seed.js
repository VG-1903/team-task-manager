// Optional seed: creates a demo admin + member + project + tasks.
// Run with: npm --prefix server run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  const memberPass = await bcrypt.hash('member123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', name: 'Demo Admin', passwordHash: adminPass },
  });
  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: { email: 'member@example.com', name: 'Demo Member', passwordHash: memberPass },
  });

  let project = await prisma.project.findFirst({ where: { name: 'Demo Project', ownerId: admin.id } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Demo Project',
        description: 'Sample project showcasing tasks, roles, and overdue tracking.',
        ownerId: admin.id,
        members: {
          create: [
            { userId: admin.id, role: 'ADMIN' },
            { userId: member.id, role: 'MEMBER' },
          ],
        },
      },
    });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.task.createMany({
      data: [
        {
          title: 'Set up CI/CD',
          description: 'Configure Railway auto-deploys',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: tomorrow,
          projectId: project.id,
          creatorId: admin.id,
          assigneeId: admin.id,
        },
        {
          title: 'Write API docs',
          description: 'Document REST endpoints in README',
          status: 'TODO',
          priority: 'MEDIUM',
          dueDate: nextWeek,
          projectId: project.id,
          creatorId: admin.id,
          assigneeId: member.id,
        },
        {
          title: 'Fix login bug',
          description: 'Validation error message disappears too fast',
          status: 'TODO',
          priority: 'HIGH',
          dueDate: yesterday, // overdue
          projectId: project.id,
          creatorId: admin.id,
          assigneeId: member.id,
        },
        {
          title: 'Initial schema design',
          status: 'DONE',
          priority: 'MEDIUM',
          projectId: project.id,
          creatorId: admin.id,
          assigneeId: admin.id,
        },
      ],
    });
  }

  console.log('Seeded:');
  console.log('  admin@example.com  / admin123');
  console.log('  member@example.com / member123');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
