const express = require('express');
const asyncHandler = require('../middlewares/asyncHandler');

const createAuthRoutes = ({ authController }) => {
  const router = express.Router();

  router.post('/google', asyncHandler(authController.loginWithGoogle));
  router.get('/google/callback', asyncHandler(authController.googleCallback));

  return router;
};

module.exports = createAuthRoutes;
