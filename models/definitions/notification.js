module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      /** Recipient (Neon Users.id) */
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [
            [
              "admin_announcement",
              "community_post",
              "comment",
              "like",
              "event_reminder",
              "business_update",
              "moderation_update",
            ],
          ],
        },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      actorUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      actorName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      actorAvatarUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      targetType: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [["post", "event", "business", "place", "about"]],
        },
      },
      targetId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "Notifications",
      timestamps: true,
      indexes: [
        { fields: ["userId", "createdAt"] },
        { fields: ["userId", "isRead"] },
      ],
    },
  );

  return Notification;
};
