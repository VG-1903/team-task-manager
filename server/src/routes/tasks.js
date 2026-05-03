const router = require('express').Router({ mergeParams: true });
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/taskController');

router.get('/', asyncHandler(ctrl.listTasks));
router.post('/', asyncHandler(ctrl.createTask));
router.get('/:taskId', asyncHandler(ctrl.getTask));
router.patch('/:taskId', asyncHandler(ctrl.updateTask));
router.delete('/:taskId', asyncHandler(ctrl.deleteTask));

module.exports = router;
