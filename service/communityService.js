const { db } = require("../models");
const {
  COMMUNITY_POST_CATEGORIES,
  isCommunityPostCategory,
} = require("../constants/communityCategories");
const {
  DEFAULT_ME_LIMIT,
  MAX_ME_LIMIT,
  parseLimitOffset,
  trimPage,
} = require("../utils/pagination");
const { parseOptionalR2ImageUrl } = require("../utils/r2ImageUrl.utils");

const MAX_CONTENT_LENGTH = 2000;

const LIST_ATTRIBUTES = [
  "id",
  "content",
  "contentIsUrdu",
  "category",
  "isPinned",
  "likeCount",
  "imageUrl",
  "createdByUserId",
  "createdAt",
  "updatedAt",
];

const AUTHOR_ATTRIBUTES = ["id", "firstName", "lastName", "imageUrl", "role"];

function isAdmin(user) {
  return Boolean(user && user.role === "admin");
}

/** Owner or admin may edit/delete. */
function canMutatePost(user, post) {
  if (!user || !post) return false;
  if (isAdmin(user)) return true;
  return post.createdByUserId === user.id;
}

function trimRequired(value, field) {
  if (value === undefined || value === null || typeof value !== "string") {
    return {
      error: {
        status: 400,
        message: `\`${field}\` is required`,
        errors: [{ field, code: "required" }],
      },
    };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      error: {
        status: 400,
        message: `\`${field}\` is required`,
        errors: [{ field, code: "required" }],
      },
    };
  }
  return { value: trimmed };
}

function toPublicAuthor(user) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    role: user.role,
  };
}

function toPublicPost(post, { isLikedByMe = false } = {}) {
  const author = post.author || post.creator || null;
  return {
    id: post.id,
    content: post.content,
    contentIsUrdu: Boolean(post.contentIsUrdu),
    category: post.category,
    isPinned: Boolean(post.isPinned),
    likeCount: post.likeCount,
    imageUrl: post.imageUrl || null,
    isLikedByMe: Boolean(isLikedByMe),
    createdByUserId: post.createdByUserId,
    author: toPublicAuthor(author),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function authorInclude() {
  return {
    model: db.User,
    as: "author",
    attributes: AUTHOR_ATTRIBUTES,
  };
}

function parseCreateInput(body, actor) {
  if (!body || typeof body !== "object") {
    return {
      error: {
        status: 400,
        message: "Request body is required",
        errors: [{ code: "invalid_body" }],
      },
    };
  }

  const contentParsed = trimRequired(body.content, "content");
  if (contentParsed.error) return contentParsed;
  if (contentParsed.value.length > MAX_CONTENT_LENGTH) {
    return {
      error: {
        status: 400,
        message: `\`content\` must be at most ${MAX_CONTENT_LENGTH} characters`,
        errors: [{ field: "content", code: "too_long" }],
      },
    };
  }

  if (!isCommunityPostCategory(body.category)) {
    return {
      error: {
        status: 400,
        message: `\`category\` must be one of: ${COMMUNITY_POST_CATEGORIES.join(", ")}`,
        errors: [{ field: "category", code: "invalid" }],
      },
    };
  }

  const contentIsUrdu = Boolean(body.contentIsUrdu);
  let isPinned = false;
  if (Object.prototype.hasOwnProperty.call(body, "isPinned")) {
    if (!isAdmin(actor)) {
      return {
        error: {
          status: 403,
          message: "Forbidden — only admin can pin posts",
          errors: [{ code: "forbidden" }],
        },
      };
    }
    isPinned = Boolean(body.isPinned);
  }

  let imageUrl = null;
  if (body.imageUrl !== undefined && body.imageUrl !== null) {
    const imageParsed = parseOptionalR2ImageUrl(body.imageUrl, "imageUrl");
    if (imageParsed.error) return imageParsed;
    imageUrl = imageParsed.value;
  }

  return {
    data: {
      content: contentParsed.value,
      category: body.category,
      contentIsUrdu,
      isPinned,
      imageUrl,
    },
  };
}

function parseUpdateInput(body, actor) {
  if (!body || typeof body !== "object") {
    return {
      error: {
        status: 400,
        message: "Request body is required",
        errors: [{ code: "invalid_body" }],
      },
    };
  }

  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, "content")) {
    const contentParsed = trimRequired(body.content, "content");
    if (contentParsed.error) return contentParsed;
    if (contentParsed.value.length > MAX_CONTENT_LENGTH) {
      return {
        error: {
          status: 400,
          message: `\`content\` must be at most ${MAX_CONTENT_LENGTH} characters`,
          errors: [{ field: "content", code: "too_long" }],
        },
      };
    }
    patch.content = contentParsed.value;
  }

  if (Object.prototype.hasOwnProperty.call(body, "category")) {
    if (!isCommunityPostCategory(body.category)) {
      return {
        error: {
          status: 400,
          message: `\`category\` must be one of: ${COMMUNITY_POST_CATEGORIES.join(", ")}`,
          errors: [{ field: "category", code: "invalid" }],
        },
      };
    }
    patch.category = body.category;
  }

  if (Object.prototype.hasOwnProperty.call(body, "contentIsUrdu")) {
    patch.contentIsUrdu = Boolean(body.contentIsUrdu);
  }

  if (Object.prototype.hasOwnProperty.call(body, "isPinned")) {
    if (!isAdmin(actor)) {
      return {
        error: {
          status: 403,
          message: "Forbidden — only admin can pin posts",
          errors: [{ code: "forbidden" }],
        },
      };
    }
    patch.isPinned = Boolean(body.isPinned);
  }

  if (Object.prototype.hasOwnProperty.call(body, "imageUrl")) {
    const imageParsed = parseOptionalR2ImageUrl(body.imageUrl, "imageUrl");
    if (imageParsed.error) return imageParsed;
    patch.imageUrl = imageParsed.value;
  }

  if (Object.keys(patch).length === 0) {
    return {
      error: {
        status: 400,
        message: "No updatable fields provided",
        errors: [{ code: "empty_patch" }],
      },
    };
  }

  return { data: patch };
}

async function likedPostIdSet(userId, postIds) {
  if (!userId || !postIds.length) return new Set();
  const rows = await db.CommunityPostLike.findAll({
    where: { userId, postId: postIds },
    attributes: ["postId"],
  });
  return new Set(rows.map((row) => row.postId));
}

/**
 * Public feed — pinned first, then newest.
 * Optional category filter (fixed enum). Always paginated.
 */
async function listPosts({ category, limit, offset } = {}) {
  const where = {};
  if (category) {
    if (!isCommunityPostCategory(category)) {
      return {
        error: {
          status: 400,
          message: `\`category\` must be one of: ${COMMUNITY_POST_CATEGORIES.join(", ")}`,
          errors: [{ field: "category", code: "invalid" }],
        },
      };
    }
    where.category = category;
  }

  const page = parseLimitOffset({ limit, offset });
  const rows = await db.CommunityPost.findAll({
    where,
    attributes: LIST_ATTRIBUTES,
    include: [authorInclude()],
    order: [
      ["isPinned", "DESC"],
      ["createdAt", "DESC"],
    ],
    limit: page.limit + 1,
    offset: page.offset,
  });

  const { items, meta } = trimPage(rows, page);
  return { posts: items, meta };
}

async function listPostsForUser(userId, { limit, offset } = {}) {
  const page = parseLimitOffset(
    { limit, offset },
    { defaultLimit: DEFAULT_ME_LIMIT, maxLimit: MAX_ME_LIMIT },
  );
  const rows = await db.CommunityPost.findAll({
    where: { createdByUserId: userId },
    attributes: LIST_ATTRIBUTES,
    include: [authorInclude()],
    order: [
      ["isPinned", "DESC"],
      ["createdAt", "DESC"],
    ],
    limit: page.limit + 1,
    offset: page.offset,
  });

  const { items, meta } = trimPage(rows, page);
  return { posts: items, meta };
}

async function getPostById(id) {
  return db.CommunityPost.findByPk(id, {
    include: [authorInclude()],
  });
}

async function createPost(actor, body) {
  const parsed = parseCreateInput(body, actor);
  if (parsed.error) return { error: parsed.error };

  const post = await db.CommunityPost.create({
    ...parsed.data,
    createdByUserId: actor.id,
    likeCount: 0,
  });
  await post.reload({ include: [authorInclude()] });
  return { post };
}

async function updatePost(actor, postId, body) {
  const post = await getPostById(postId);
  if (!post) {
    return {
      error: {
        status: 404,
        message: "Post not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  if (!canMutatePost(actor, post)) {
    return {
      error: {
        status: 403,
        message: "Forbidden — you can only edit your own posts",
        errors: [{ code: "forbidden" }],
      },
    };
  }

  const parsed = parseUpdateInput(body, actor);
  if (parsed.error) return { error: parsed.error };

  await post.update(parsed.data);
  await post.reload({ include: [authorInclude()] });
  return { post };
}

async function deletePost(actor, postId) {
  const post = await getPostById(postId);
  if (!post) {
    return {
      error: {
        status: 404,
        message: "Post not found",
        errors: [{ code: "not_found" }],
      },
    };
  }

  if (!canMutatePost(actor, post)) {
    return {
      error: {
        status: 403,
        message: "Forbidden — you can only delete your own posts",
        errors: [{ code: "forbidden" }],
      },
    };
  }

  const snapshot = toPublicPost(post);
  await db.sequelize.transaction(async (transaction) => {
    await db.CommunityPostLike.destroy({
      where: { postId: post.id },
      transaction,
    });
    await post.destroy({ transaction });
  });

  return { post: snapshot };
}

/**
 * Toggle like. Transaction + row lock so likeCount stays correct.
 * Lock the post row alone — never FOR UPDATE with an OUTER JOIN (Postgres error).
 * @returns {{ post, isLikedByMe } | null}
 */
async function toggleLike(userId, postId) {
  return db.sequelize.transaction(async (transaction) => {
    const post = await db.CommunityPost.findByPk(postId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!post) return null;

    const existing = await db.CommunityPostLike.findOne({
      where: { userId, postId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    let isLikedByMe = false;

    if (existing) {
      await existing.destroy({ transaction });
      await db.CommunityPost.update(
        {
          likeCount: db.sequelize.literal('GREATEST("likeCount" - 1, 0)'),
        },
        { where: { id: post.id }, transaction },
      );
      isLikedByMe = false;
    } else {
      try {
        await db.CommunityPostLike.create(
          { userId, postId },
          { transaction },
        );
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
          isLikedByMe = true;
        } else {
          throw error;
        }
      }

      if (!isLikedByMe) {
        await db.CommunityPost.update(
          {
            likeCount: db.sequelize.literal('"likeCount" + 1'),
          },
          { where: { id: post.id }, transaction },
        );
        isLikedByMe = true;

        // Notify post author (skip self). Outside hot path failures are ignored.
        try {
          const notificationService = require("./notificationService");
          const actor = await db.User.findByPk(userId, {
            attributes: ["id", "firstName", "lastName", "imageUrl"],
            transaction,
          });
          await notificationService.notifyUser({
            userId: post.createdByUserId,
            type: "like",
            title: `${notificationService.displayName(actor)} liked your post`,
            body: "Your neighbourhood post got a like.",
            actorUserId: userId,
            actorName: notificationService.displayName(actor),
            actorAvatarUrl: actor?.imageUrl || null,
            targetType: "post",
            targetId: post.id,
            transaction,
          });
        } catch (_) {
          // Inbox is best-effort — never fail the like toggle.
        }
      }
    }

    const withAuthor = await db.CommunityPost.findByPk(postId, {
      transaction,
      include: [authorInclude()],
    });

    return { post: withAuthor, isLikedByMe };
  });
}

module.exports = {
  COMMUNITY_POST_CATEGORIES,
  toPublicPost,
  canMutatePost,
  likedPostIdSet,
  listPosts,
  listPostsForUser,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
};
