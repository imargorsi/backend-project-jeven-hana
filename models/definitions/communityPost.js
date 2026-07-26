module.exports = (sequelize, DataTypes) => {
  const CommunityPost = sequelize.define(
    "CommunityPost",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      /** When true, clients should render RTL + Urdu font. */
      contentIsUrdu: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      /**
       * Fixed v1 enum — see constants/communityCategories.js
       * announcements | news | alerts | lost-found | recommendations | help | buy-sell | talk
       */
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isPinned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      likeCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "CommunityPosts",
      timestamps: true,
      indexes: [
        { fields: ["category"] },
        { fields: ["createdByUserId"] },
        { fields: ["isPinned", "createdAt"] },
        /** Filtered feed: category + pinned + newest. */
        {
          name: "community_posts_category_is_pinned_created_at",
          fields: ["category", "isPinned", "createdAt"],
        },
      ],
    },
  );

  return CommunityPost;
};
