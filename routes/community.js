var express = require("express");
var router = express.Router();

const { getAuth } = require("@clerk/express");
const { requireAuth } = require("../middleware/requireAuth");
const { attachLocalUser } = require("../middleware/attachLocalUser");
const communityService = require("../service/communityService");
const { db } = require("../models");
const {
  COMMUNITY_POST_CATEGORIES,
} = require("../constants/communityCategories");
const { success, fail } = require("../utils/apiResponse");

function respondServiceError(res, error) {
  return fail(res, error.message, error.status || 400, error.errors || []);
}

async function localUserIdForClerk(clerkUserId) {
  if (!clerkUserId) return null;
  const user = await db.User.findOne({
    where: { clerkId: clerkUserId },
    attributes: ["id"],
  });
  return user ? user.id : null;
}

/**
 * GET /api/v1/community/categories
 * Fixed v1 category list (public).
 */
router.get("/api/v1/community/categories", function (req, res) {
  return success(res, { categories: COMMUNITY_POST_CATEGORIES }, "OK");
});

/**
 * GET /api/v1/community/posts
 * Public feed. Optional ?category=&limit=&offset=. Bearer marks isLikedByMe.
 * Default limit 20, max 50.
 */
router.get("/api/v1/community/posts", async function (req, res, next) {
  try {
    const auth = getAuth(req);
    const [result, localUserId] = await Promise.all([
      communityService.listPosts({
        category: req.query.category || undefined,
        limit: req.query.limit,
        offset: req.query.offset,
      }),
      localUserIdForClerk(auth?.userId),
    ]);
    if (result.error) {
      return respondServiceError(res, result.error);
    }

    const liked = await communityService.likedPostIdSet(
      localUserId,
      result.posts.map((post) => post.id),
    );

    return success(
      res,
      {
        posts: result.posts.map((post) =>
          communityService.toPublicPost(post, {
            isLikedByMe: liked.has(post.id),
          }),
        ),
        meta: result.meta,
      },
      "OK",
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/community/posts
 * Signed-in create (live immediately — no approval).
 */
router.post(
  "/api/v1/community/posts",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await communityService.createPost(req.user, req.body);
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(
        res,
        {
          post: communityService.toPublicPost(result.post, {
            isLikedByMe: false,
          }),
        },
        "Created",
        201,
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/v1/community/posts/me
 * Signed-in user's posts. Before :id.
 * Optional ?limit=&offset= (default 50, max 100).
 */
router.get(
  "/api/v1/community/posts/me",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await communityService.listPostsForUser(req.user.id, {
        limit: req.query.limit,
        offset: req.query.offset,
      });
      const liked = await communityService.likedPostIdSet(
        req.user.id,
        result.posts.map((post) => post.id),
      );

      return success(
        res,
        {
          posts: result.posts.map((post) =>
            communityService.toPublicPost(post, {
              isLikedByMe: liked.has(post.id),
            }),
          ),
          meta: result.meta,
        },
        "OK",
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/v1/community/posts/:id
 * Public single post.
 */
router.get("/api/v1/community/posts/:id", async function (req, res, next) {
  try {
    const post = await communityService.getPostById(req.params.id);
    if (!post) {
      return fail(res, "Post not found", 404, [{ code: "not_found" }]);
    }

    const auth = getAuth(req);
    const localUserId = await localUserIdForClerk(auth?.userId);
    const liked = await communityService.likedPostIdSet(localUserId, [
      post.id,
    ]);

    return success(
      res,
      {
        post: communityService.toPublicPost(post, {
          isLikedByMe: liked.has(post.id),
        }),
      },
      "OK",
    );
  } catch (error) {
    return next(error);
  }
});

/**
 * PATCH /api/v1/community/posts/:id
 * Owner or admin edit.
 */
router.patch(
  "/api/v1/community/posts/:id",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await communityService.updatePost(
        req.user,
        req.params.id,
        req.body,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      const liked = await communityService.likedPostIdSet(req.user.id, [
        result.post.id,
      ]);

      return success(
        res,
        {
          post: communityService.toPublicPost(result.post, {
            isLikedByMe: liked.has(result.post.id),
          }),
        },
        "Updated",
      );
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * DELETE /api/v1/community/posts/:id
 * Owner or admin delete.
 */
router.delete(
  "/api/v1/community/posts/:id",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await communityService.deletePost(
        req.user,
        req.params.id,
      );
      if (result.error) {
        return respondServiceError(res, result.error);
      }

      return success(res, { post: result.post }, "Deleted");
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * POST /api/v1/community/posts/:id/like
 * Toggle like (signed-in).
 */
router.post(
  "/api/v1/community/posts/:id/like",
  requireAuth,
  attachLocalUser,
  async function (req, res, next) {
    try {
      const result = await communityService.toggleLike(
        req.user.id,
        req.params.id,
      );
      if (!result) {
        return fail(res, "Post not found", 404, [{ code: "not_found" }]);
      }

      return success(
        res,
        {
          post: communityService.toPublicPost(result.post, {
            isLikedByMe: result.isLikedByMe,
          }),
        },
        result.isLikedByMe ? "Liked" : "Unliked",
      );
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
