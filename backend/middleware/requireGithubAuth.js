const User = require('../models/User');

async function requireGithubAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({
      error: 'GitHub login required',
      code: 'AUTH_REQUIRED'
    });
  }

  const user = await User.findOne({ sessionToken: token }).lean();

  if (!user || !user.accessToken) {
    return res.status(401).json({
      error: 'Session expired. Please login again.',
      code: 'AUTH_REQUIRED'
    });
  }

  req.githubToken = user.accessToken;
  req.user = {
    id: String(user._id),
    githubId: user.githubId,
    username: user.username,
    analysisFilesUsed: Number(user.analysisFilesUsed || 0)
  };

  return next();
}

module.exports = requireGithubAuth;