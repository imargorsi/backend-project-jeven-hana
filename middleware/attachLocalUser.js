const userService = require("../service/userService");
const { fail } = require("../utils/apiResponse");

/**
 * Load local User for the authenticated Clerk user.
 * Use after requireAuth. Sets req.user.
 *
 * Fast path: Neon lookup by clerkId (no Clerk HTTP).
 * Full Clerk → Neon sync only when the local row is missing
 * (AuthSessionSync / GET /auth/me keeps profile fresh on app open).
 */
async function attachLocalUser(req, res, next) {
  try {
    const clerkId = req.clerkUserId;
    if (!clerkId) {
      return fail(res, "Unauthorized", 401, [{ code: "unauthorized" }]);
    }

    let user = await userService.findByClerkId(clerkId);
    if (!user) {
      user = await userService.syncUserFromClerk(clerkId);
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { attachLocalUser };
