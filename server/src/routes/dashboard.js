const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { dashboard } = require('../controllers/dashboardController');

router.get('/', authenticate, asyncHandler(dashboard));

module.exports = router;
