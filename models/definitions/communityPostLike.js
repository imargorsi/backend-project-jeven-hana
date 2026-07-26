module.exports = (sequelize, DataTypes) => {
  const CommunityPostLike = sequelize.define(
    "CommunityPostLike",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      postId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "CommunityPostLikes",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["postId", "userId"],
        },
        /** Batch isLikedByMe: WHERE userId = ? AND postId IN (…) */
        {
          name: "community_post_likes_user_id_post_id",
          fields: ["userId", "postId"],
        },
      ],
    },
  );

  return CommunityPostLike;
};
