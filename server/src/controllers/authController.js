const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/db');
const { signToken } = require('../utils/jwt');
const HttpError = require('../utils/httpError');

const signupSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function signup(req, res) {
  const data = signupSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new HttpError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      name: data.name.trim(),
      passwordHash,
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const token = signToken({ sub: user.id });
  res.status(201).json({ user, token });
}

async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid email or password');

  const token = signToken({ sub: user.id });
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { signup, login, me };
