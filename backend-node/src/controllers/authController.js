class AuthController {
  constructor({ googleAuthService }) {
    this.googleAuthService = googleAuthService;
  }

  loginWithGoogle = async (req, res) => {
    const { token } = req.body;
    const result = await this.googleAuthService.authenticateWithGoogle(token);
    return res.status(200).json(result);
  };

  googleCallback = async (_req, res) =>
    res.status(200).json({
      message:
        'Callback OAuth configurado. Para SPA Angular com idToken, utilize POST /auth/google.',
    });
}

module.exports = AuthController;
