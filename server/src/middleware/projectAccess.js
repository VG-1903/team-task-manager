const prisma = require('../config/db');
const HttpError = require('../utils/httpError');

// Loads :projectId from params, verifies the user is a member, and attaches
// req.project + req.projectRole. Use requireProjectRole('ADMIN') after this for
// admin-only endpoints.
async function loadProjectMembership(req, _res, next) {
  try {
    const projectId = req.params.projectId || req.params.id;
    if (!projectId) throw new HttpError(400, 'Project id required');

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
      include: { project: true },
    });

    if (!membership) throw new HttpError(403, 'You are not a member of this project');

    req.project = membership.project;
    req.projectRole = membership.role;
    next();
  } catch (err) {
    next(err);
  }
}

function requireProjectRole(...roles) {
  return (req, _res, next) => {
    if (!req.projectRole) return next(new HttpError(500, 'projectRole not loaded'));
    if (!roles.includes(req.projectRole)) {
      return next(new HttpError(403, `Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

module.exports = { loadProjectMembership, requireProjectRole };
