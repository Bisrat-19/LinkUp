const { body, validationResult } = require('express-validator');

const registerValidation = [
  body('fullName')
    .isLength({ min: 2, max: 100 })
    .trim()
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name must be 2-100 characters and only contain letters and spaces'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .trim()
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and only contain letters, numbers, or underscores'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { registerValidation, loginValidation, validate };
