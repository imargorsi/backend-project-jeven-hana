const { Op } = require("sequelize");
const { clerkClient } = require("@clerk/express");
const { db } = require("../models");

const ACCOUNT_DELETE_CONFIRM = "DELETE";

function resolveRole(clerkUser) {
  const metaRole = clerkUser?.publicMetadata?.role;
  return metaRole === "admin" ? "admin" : "user";
}

function primaryEmail(clerkUser) {
  const addresses = clerkUser?.emailAddresses || [];
  const primaryId = clerkUser?.primaryEmailAddressId;
  const primary = addresses.find((item) => item.id === primaryId);
  return primary?.emailAddress || addresses[0]?.emailAddress || null;
}

/**
 * Upsert local User from Clerk user id (fetch full profile from Clerk).
 */
async function syncUserFromClerk(clerkId) {
  const clerkUser = await clerkClient.users.getUser(clerkId);

  const payload = {
    clerkId,
    email: primaryEmail(clerkUser),
    firstName: clerkUser.firstName || null,
    lastName: clerkUser.lastName || null,
    imageUrl: clerkUser.imageUrl || null,
    role: resolveRole(clerkUser),
  };

  const existing = await db.User.findOne({ where: { clerkId } });
  if (existing) {
    await existing.update(payload);
    return existing;
  }

  return db.User.create(payload);
}

async function findByClerkId(clerkId) {
  return db.User.findOne({ where: { clerkId } });
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Remove local Neon rows for a user (content + relations), then delete Clerk user.
 * Requires body confirm === "DELETE".
 */
async function deleteAccountForClerkUser(clerkId, confirm) {
  if (String(confirm || "").trim() !== ACCOUNT_DELETE_CONFIRM) {
    return {
      error: {
        status: 400,
        message: `Type ${ACCOUNT_DELETE_CONFIRM} to confirm account deletion.`,
        errors: [{ field: "confirm", code: "confirmation_required" }],
      },
    };
  }

  const user = await db.User.findOne({ where: { clerkId } });

  if (user) {
    const userId = user.id;

    await db.sequelize.transaction(async (transaction) => {
      await db.EventGoing.destroy({ where: { userId }, transaction });
      await db.CommunityPostLike.destroy({ where: { userId }, transaction });

      await db.Notification.destroy({
        where: {
          [Op.or]: [{ userId }, { actorUserId: userId }],
        },
        transaction,
      });

      await db.BusinessReview.destroy({
        where: { createdByUserId: userId },
        transaction,
      });

      const ownedBusinesses = await db.Business.findAll({
        where: { createdByUserId: userId },
        attributes: ["id"],
        transaction,
      });
      const businessIds = ownedBusinesses.map((row) => row.id);
      if (businessIds.length) {
        await db.BusinessReview.destroy({
          where: { businessId: { [Op.in]: businessIds } },
          transaction,
        });
        await db.Business.destroy({
          where: { id: { [Op.in]: businessIds } },
          transaction,
        });
      }

      await db.CommunityPost.destroy({
        where: { createdByUserId: userId },
        transaction,
      });

      const ownedEvents = await db.Event.findAll({
        where: { createdByUserId: userId },
        attributes: ["id"],
        transaction,
      });
      const eventIds = ownedEvents.map((row) => row.id);
      if (eventIds.length) {
        await db.EventGoing.destroy({
          where: { eventId: { [Op.in]: eventIds } },
          transaction,
        });
        await db.Event.destroy({
          where: { id: { [Op.in]: eventIds } },
          transaction,
        });
      }

      await user.destroy({ transaction });
    });
  }

  try {
    await clerkClient.users.deleteUser(clerkId);
  } catch (error) {
    const status = error?.status || error?.statusCode;
    if (status !== 404) {
      return {
        error: {
          status: 502,
          message:
            "Account data was removed, but sign-in cleanup failed. Please contact support if you can still sign in.",
          errors: [{ code: "clerk_delete_failed" }],
        },
      };
    }
  }

  return { data: { deleted: true } };
}

module.exports = {
  ACCOUNT_DELETE_CONFIRM,
  syncUserFromClerk,
  findByClerkId,
  toPublicUser,
  resolveRole,
  deleteAccountForClerkUser,
};
