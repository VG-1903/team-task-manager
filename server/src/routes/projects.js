const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { loadProjectMembership, requireProjectRole } = require('../middleware/projectAccess');
const ctrl = require('../controllers/projectController');
const taskRouter = require('./tasks');

router.use(authenticate);

router.get('/', asyncHandler(ctrl.listProjects));
router.post('/', asyncHandler(ctrl.createProject));

// Mounted routes need :id param to load membership
router.get('/:id', asyncHandler(loadProjectMembership), asyncHandler(ctrl.getProject));
router.patch(
  '/:id',
  asyncHandler(loadProjectMembership),
  requireProjectRole('ADMIN'),
  asyncHandler(ctrl.updateProject)
);
router.delete(
  '/:id',
  asyncHandler(loadProjectMembership),
  requireProjectRole('ADMIN'),
  asyncHandler(ctrl.deleteProject)
);

// Members
router.post(
  '/:id/members',
  asyncHandler(loadProjectMembership),
  requireProjectRole('ADMIN'),
  asyncHandler(ctrl.addMember)
);
router.patch(
  '/:id/members/:memberId',
  asyncHandler(loadProjectMembership),
  requireProjectRole('ADMIN'),
  asyncHandler(ctrl.updateMemberRole)
);
router.delete(
  '/:id/members/:memberId',
  asyncHandler(loadProjectMembership),
  requireProjectRole('ADMIN'),
  asyncHandler(ctrl.removeMember)
);

// Tasks scoped under a project — projectId param
router.use('/:projectId/tasks', asyncHandler(loadProjectMembership), taskRouter);

module.exports = router;
