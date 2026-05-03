const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { signup, login, me } = require('../controllers/authController');

router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));

module.exports = router;
