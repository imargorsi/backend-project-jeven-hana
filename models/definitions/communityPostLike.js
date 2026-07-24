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
      ],
    },
  );

  return CommunityPostLike;
};
