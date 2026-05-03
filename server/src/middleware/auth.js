const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/db');
const HttpError = require('../utils/httpError');

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) throw new HttpError(401, 'Missing authorization token');

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new HttpError(401, 'User no longer exists');

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    return next(new HttpError(401, 'Invalid or expired token'));
  }
}

module.exports = { authenticate };
