/**
 * Auth Middleware — JWT + legacy API key validation, admin key management.
 */
const { state } = require('./state');
const { resolveAuth } = require('./auth');

function getMasterKey() {
  const envKeys = [
    ...(process.env.API_KEYS ? process.env.API_KEYS.split(',').map(k => k.trim()).filter(Boolean) : []),
    ...(process.env.API_KEY ? [process.env.API_KEY.trim()] : []),
  ];
  return envKeys[0] || '';
}

// ─── requireAuth — accepts JWT (Bearer) or legacy API key (x-api-key) ───────
// Attaches req.auth = { userId, userName, isAdmin } on success.
function requireAuth(req, res, next) {
  const auth = resolveAuth(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized', hint: 'Set Authorization: Bearer <token> header or X-API-Key header' });
  }
  req.auth = auth;
  next();
}

// ─── requireSelf — must be authenticated AND target matches own userId ───────
// Use for per-user scoped mutations: requireAuth first, then requireSelf.
// Param name defaults to 'name' (matches :name in URL).
// Admins bypass the check.
function requireSelf(paramName = 'name') {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Admins can act on behalf of any user
    if (req.auth.isAdmin) return next();

    const target = req.params[paramName]?.toLowerCase();
    const userId = req.auth.userId?.toLowerCase();
    const userName = req.auth.userName?.toLowerCase();

    if (target && (target === userId || target === userName)) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden — you can only modify your own data' });
  };
}

function requireMasterKey(req, res, next) {
  // Support both JWT admin and legacy master key
  const auth = resolveAuth(req);
  if (auth && auth.isAdmin) {
    req.auth = auth;
    return next();
  }
  return res.status(401).json({ error: 'Master key required' });
}

// ─── Legacy alias — maps to requireAuth for backward compat ─────────────────
const requireApiKey = requireAuth;

module.exports = {
  getMasterKey,
  requireAuth,
  requireSelf,
  requireMasterKey,
  requireApiKey,
};
