const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/users/search?q=foo — find users by email or name (for invitations)
router.get(
  '/search',
  authenticate,
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').toString().trim();
    if (q.length < 2) return res.json({ users: [] });
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true },
      take: 10,
    });
    res.json({ users });
  })
);

module.exports = router;
