const { z } = require('zod');
const prisma = require('../config/db');
const HttpError = require('../utils/httpError');

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const isoDate = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d;
}, z.date().nullable().optional());

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(TASK_STATUSES).default('TODO'),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  dueDate: isoDate,
  assigneeId: z.string().nullable().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: isoDate,
  assigneeId: z.string().nullable().optional(),
});

async function ensureAssigneeIsMember(projectId, assigneeId) {
  if (!assigneeId) return;
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
  });
  if (!member) throw new HttpError(400, 'Assignee must be a project member');
}

// GET /api/projects/:projectId/tasks?status=&assigneeId=
async function listTasks(req, res) {
  const { status, assigneeId } = req.query;
  const tasks = await prisma.task.findMany({
    where: {
      projectId: req.project.id,
      ...(status && TASK_STATUSES.includes(status) ? { status } : {}),
      ...(assigneeId ? { assigneeId } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ tasks });
}

// POST /api/projects/:projectId/tasks — any member can create
async function createTask(req, res) {
  const data = createTaskSchema.parse(req.body);
  await ensureAssigneeIsMember(req.project.id, data.assigneeId);

  const task = await prisma.task.create({
    data: {
      title: data.title.trim(),
      description: data.description ?? null,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ?? null,
      assigneeId: data.assigneeId ?? null,
      creatorId: req.user.id,
      projectId: req.project.id,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });
  res.status(201).json({ task });
}

// GET /api/projects/:projectId/tasks/:taskId
async function getTask(req, res) {
  const task = await prisma.task.findFirst({
    where: { id: req.params.taskId, projectId: req.project.id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });
  if (!task) throw new HttpError(404, 'Task not found');
  res.json({ task });
}

// PATCH /api/projects/:projectId/tasks/:taskId
// Members can update tasks they created or are assigned to + change status of their own tasks.
// Admins can update any task in the project.
async function updateTask(req, res) {
  const data = updateTaskSchema.parse(req.body);
  const task = await prisma.task.findFirst({
    where: { id: req.params.taskId, projectId: req.project.id },
  });
  if (!task) throw new HttpError(404, 'Task not found');

  const isAdmin = req.projectRole === 'ADMIN';
  const isOwnerOrAssignee = task.creatorId === req.user.id || task.assigneeId === req.user.id;
  if (!isAdmin && !isOwnerOrAssignee) {
    throw new HttpError(403, 'You can only edit tasks you created or are assigned to');
  }

  // Only admins can reassign tasks to others
  if (!isAdmin && data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
    throw new HttpError(403, 'Only admins can reassign tasks');
  }

  if (data.assigneeId !== undefined) {
    await ensureAssigneeIsMember(req.project.id, data.assigneeId);
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      ...('title' in data ? { title: data.title.trim() } : {}),
      ...('description' in data ? { description: data.description } : {}),
      ...('status' in data ? { status: data.status } : {}),
      ...('priority' in data ? { priority: data.priority } : {}),
      ...('dueDate' in data ? { dueDate: data.dueDate ?? null } : {}),
      ...('assigneeId' in data ? { assigneeId: data.assigneeId ?? null } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
  });
  res.json({ task: updated });
}

// DELETE /api/projects/:projectId/tasks/:taskId — admin or task creator
async function deleteTask(req, res) {
  const task = await prisma.task.findFirst({
    where: { id: req.params.taskId, projectId: req.project.id },
  });
  if (!task) throw new HttpError(404, 'Task not found');
  const isAdmin = req.projectRole === 'ADMIN';
  if (!isAdmin && task.creatorId !== req.user.id) {
    throw new HttpError(403, 'Only the creator or an admin can delete this task');
  }
  await prisma.task.delete({ where: { id: task.id } });
  res.status(204).end();
}

module.exports = { listTasks, createTask, getTask, updateTask, deleteTask };
