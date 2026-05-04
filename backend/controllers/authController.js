const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://repo-analyzer-gamma.vercel.app').replace(/\/$/, '');
const FRONTEND_URLS = [
  FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/\/$/, '')),
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const isAllowedFrontendOrigin = (origin) => {
  if (!origin) {
    return false;
  }

  if (FRONTEND_URLS.includes(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

const sanitizeFrontendOrigin = (value) => {
  if (!value || typeof value !== 'string') {
    return FRONTEND_URL;
  }

  const normalized = value.replace(/\/$/, '');
  return isAllowedFrontendOrigin(normalized) ? normalized : FRONTEND_URL;
};

const safeRedirectPath = (value) => {
  if (!value || typeof value !== 'string') {
    return '/';
  }

  return value.startsWith('/') ? value : '/';
};

const getRequestOrigin = (req) => {
  // Handle x-forwarded-proto header from reverse proxies (Render, Heroku, etc.)
  let protocol = req.protocol || 'http';
  
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto) {
    // Get the first protocol if there are multiple (comma-separated)
    protocol = forwardedProto.split(',')[0].trim();
  }
  
  // Use x-forwarded-host if available (for proxied requests)
  let host = req.get('x-forwarded-host') || req.get('host');
  
  return `${protocol}://${host}`;
};

const getOauthRedirectUri = (req) => {
  // Explicitly set BACKEND_URL in environment, or fallback to derived origin
  const backendOrigin = (process.env.BACKEND_URL || getRequestOrigin(req)).replace(/\/$/, '');
  return `${backendOrigin}/api/auth/github/callback`;
};

const githubLogin = (req, res) => {
  const redirectUri = `${process.env.BACKEND_URL}/api/auth/github/callback`;

  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo&redirect_uri=${redirectUri}`;

  res.redirect(url);
};

// const githubCallback = async (req, res) => {
//   const { code, state } = req.query;
//   const redirectUri = getOauthRedirectUri(req);

//   let redirectPath = '/';
//   let frontendOrigin = FRONTEND_URL;

//   if (state) {
//     try {
//       const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
//       redirectPath = safeRedirectPath(parsedState.redirect);
//       frontendOrigin = sanitizeFrontendOrigin(parsedState.frontendOrigin);
//     } catch {
//       redirectPath = '/';
//       frontendOrigin = FRONTEND_URL;
//     }
//   }

//   try {
//     // exchange code for token
//     const tokenRes = await axios.post(
//       "https://github.com/login/oauth/access_token",
//       {
//         client_id: process.env.GITHUB_CLIENT_ID,
//         client_secret: process.env.GITHUB_CLIENT_SECRET,
//         code,
//         redirect_uri: redirectUri
//       },
//       {
//         headers: { Accept: "application/json" }
//       }
//     );

//     if (tokenRes.data.error) {
//       return res.status(400).send(tokenRes.data.error_description || 'GitHub OAuth failed');
//     }

//     const access_token = tokenRes.data.access_token;

//     if (!access_token) {
//       return res.status(400).send('GitHub token not received');
//     }

//     // get user info
//     const userRes = await axios.get(
//       "https://api.github.com/user",
//       {
//         headers: {
//           Authorization: `token ${access_token}`
//         }
//       }
//     );

//     const sessionToken = crypto.randomBytes(32).toString('hex');

//     const savedUser = await User.findOneAndUpdate(
//       { githubId: String(userRes.data.id) },
//       {
//         githubId: String(userRes.data.id),
//         username: userRes.data.login,
//         accessToken: access_token,
//         sessionToken
//       },
//       { new: true, upsert: true }
//     );

//     const queryJoiner = redirectPath.includes('?') ? '&' : '?';
//     const redirectTarget = `${frontendOrigin}${redirectPath}${queryJoiner}token=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(savedUser.username)}`;

//     res.redirect(redirectTarget);

//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Auth failed");
//   }
// };

const githubCallback = async (req, res) => {
  const { code } = req.query;

  try {
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      {
        headers: { Accept: "application/json" }
      }
    );

    const access_token = tokenRes.data.access_token;

    const userRes = await axios.get(
      "https://api.github.com/user",
      {
        headers: {
          Authorization: `token ${access_token}`
        }
      }
    );

    const sessionToken = crypto.randomBytes(32).toString('hex');

    const savedUser = await User.findOneAndUpdate(
      { githubId: String(userRes.data.id) },
      {
        githubId: String(userRes.data.id),
        username: userRes.data.login,
        accessToken: access_token,
        sessionToken
      },
      { new: true, upsert: true }
    );

    const frontendBaseUrl = (process.env.FRONTEND_URL || FRONTEND_URL).replace(/\/$/, '');
    res.redirect(
      `${frontendBaseUrl}/?token=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(savedUser.username)}&auth=1`
    );

  } catch (err) {
    console.error(err);
    res.status(500).send("Auth failed");
  }
};

const getCurrentUser = async (req, res) => {
  return res.json({
    user: {
      githubId: req.user.githubId,
      username: req.user.username,
      analysisFilesUsed: Number(req.user.analysisFilesUsed || 0)
    }
  });
};

const logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { sessionToken: null });
  return res.json({ success: true });
};

module.exports = { githubLogin, githubCallback, getCurrentUser, logout };