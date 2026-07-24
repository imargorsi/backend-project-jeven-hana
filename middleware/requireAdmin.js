const { fail } = require("../utils/apiResponse");

/**
 * Require local user role === admin.
 * Use after requireAuth + attachLocalUser.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return fail(res, "Forbidden — admin only", 403, [{ code: "forbidden" }]);
  }
  return next();
}

module.exports = { requireAdmin };
