const { getAuth } = require("@clerk/express");
const { fail } = require("../utils/apiResponse");

/**
 * Require a valid Clerk session JWT (Authorization: Bearer <token>).
 * Attaches req.auth (Clerk) for downstream handlers.
 * Returns JSON 401 — never redirects (mobile API).
 */
function requireAuth(req, res, next) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  const isAuthenticated = auth?.isAuthenticated ?? Boolean(userId);

  if (!isAuthenticated || !userId) {
    return fail(res, "Unauthorized — sign in required", 401, [
      { code: "unauthorized" },
    ]);
  }

  req.auth = auth;
  req.clerkUserId = userId;
  return next();
}

module.exports = { requireAuth };
