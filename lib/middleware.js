/**
 * Auth Middleware — API key validation and admin key management.
 */
const { state, ADMIN_KEY } = require('./state');

function getMasterKey() {
  const envKeys = [
    ...(process.env.API_KEYS ? process.env.API_KEYS.split(',').map(k => k.trim()).filter(Boolean) : []),
    ...(process.env.API_KEY ? [process.env.API_KEY.trim()] : []),
  ];
  return envKeys[0] || '';
}

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || !state.validApiKeys.has(key)) {
    return res.status(401).json({ error: 'Unauthorized', hint: 'Set X-API-Key header' });
  }
  next();
}

function requireMasterKey(req, res, next) {
  const key = req.headers['x-api-key'];
  const master = getMasterKey();
  if (!key || !master || key !== master) {
    return res.status(401).json({ error: 'Master key required' });
  }
  next();
}

module.exports = {
  getMasterKey,
  requireApiKey,
  requireMasterKey,
};
