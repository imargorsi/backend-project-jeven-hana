const userService = require("../service/userService");
const { fail } = require("../utils/apiResponse");

/**
 * Sync / load local User for the authenticated Clerk user.
 * Use after requireAuth. Sets req.user.
 */
async function attachLocalUser(req, res, next) {
  try {
    const clerkId = req.clerkUserId;
    if (!clerkId) {
      return fail(res, "Unauthorized", 401, [{ code: "unauthorized" }]);
    }

    const user = await userService.syncUserFromClerk(clerkId);
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { attachLocalUser };
