/**
 * Auth Module — JWT token generation, verification, and refresh.
 *
 * Access tokens  : short-lived (15 min), sent via Authorization header
 * Refresh tokens : long-lived (7 days), sent via httpOnly cookie
 * API keys       : legacy fallback for agents / external integrations
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { state } = require('./state');

// ─── Secret management ──────────────────────────────────────────────────────
// JWT_SECRET from env or auto-generated (persisted in appState for stability)
function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (state.appState._jwtSecret) return state.appState._jwtSecret;
  const secret = crypto.randomBytes(64).toString('hex');
  state.appState._jwtSecret = secret;
  // Persist immediately so it survives restarts
  try {
    const { saveAppState } = require('./state');
    saveAppState();
  } catch { /* ignore — will be saved on next regular save */ }
  return secret;
}

// Separate secret for refresh tokens (defense in depth)
function getRefreshSecret() {
  if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET;
  if (state.appState._jwtRefreshSecret) return state.appState._jwtRefreshSecret;
  const secret = crypto.randomBytes(64).toString('hex');
  state.appState._jwtRefreshSecret = secret;
  try {
    const { saveAppState } = require('./state');
    saveAppState();
  } catch { /* ignore */ }
  return secret;
}

// ─── Token configuration ────────────────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY  = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_COOKIE_NAME  = 'qh_refresh';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ─── Revoked refresh tokens (in-memory set, cleared on restart) ─────────────
const revokedRefreshTokens = new Set();

// ─── Token generation ───────────────────────────────────────────────────────

function generateAccessToken(user) {
  const payload = {
    sub: user.id,
    name: user.name,
    isAdmin: !!user._isAdmin,
    type: 'access',
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(user) {
  const jti = crypto.randomBytes(16).toString('hex'); // unique token id for revocation
  const payload = {
    sub: user.id,
    jti,
    type: 'refresh',
  };
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY });
}

function generateTokenPair(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

// ─── Token verification ─────────────────────────────────────────────────────

function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, getRefreshSecret());
    if (decoded.type !== 'refresh') return null;
    if (revokedRefreshTokens.has(decoded.jti)) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ─── Token revocation ───────────────────────────────────────────────────────

function revokeRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, getRefreshSecret(), { ignoreExpiration: true });
    if (decoded.jti) revokedRefreshTokens.add(decoded.jti);
  } catch { /* invalid token, nothing to revoke */ }
}

// ─── Refresh cookie helpers ─────────────────────────────────────────────────

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

function getRefreshTokenFromRequest(req) {
  // Try cookie first, then body fallback (for non-browser clients)
  if (req.cookies && req.cookies[REFRESH_COOKIE_NAME]) {
    return req.cookies[REFRESH_COOKIE_NAME];
  }
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }
  return null;
}

// ─── Extract bearer token from Authorization header ─────────────────────────

function extractBearerToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// ─── Resolve user identity from request (JWT or legacy API key) ─────────────
// Returns { userId, userName, isAdmin } or null

function resolveAuth(req) {
  // 1) Try JWT access token (Authorization: Bearer <token>)
  const bearer = extractBearerToken(req);
  if (bearer) {
    const decoded = verifyAccessToken(bearer);
    if (decoded) {
      return { userId: decoded.sub, userName: decoded.name, isAdmin: decoded.isAdmin };
    }
    // Invalid JWT — don't fall through to API key (prevents confused deputy)
    return null;
  }

  // 2) Legacy: API key via x-api-key header (for agents & backward compat)
  const apiKey = req.headers['x-api-key'];
  if (apiKey && state.validApiKeys.has(apiKey)) {
    const user = Object.values(state.users).find(u => u.apiKey === apiKey);
    const { getMasterKey } = require('./middleware');
    const master = getMasterKey();
    const isAdmin = (apiKey === master);
    return {
      userId: user ? user.id : null,
      userName: user ? user.name : null,
      isAdmin,
    };
  }

  return null;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshTokenFromRequest,
  extractBearerToken,
  resolveAuth,
  REFRESH_COOKIE_NAME,
};
