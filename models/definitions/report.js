module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define(
    "Report",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      /** Reporter (Neon Users.id) */
      reporterUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      targetType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [["post", "business", "event"]],
        },
      },
      /** String id of the reported entity (matches mobile string ids). */
      targetId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [
            [
              "spam",
              "harassment",
              "misinformation",
              "inappropriate",
              "illegal",
              "other",
            ],
          ],
        },
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "open",
        validate: {
          isIn: [["open", "reviewed", "resolved"]],
        },
      },
    },
    {
      tableName: "Reports",
      timestamps: true,
      indexes: [
        { fields: ["status", "createdAt"] },
        { fields: ["targetType", "targetId"] },
        { fields: ["reporterUserId", "targetType", "targetId"] },
      ],
    },
  );

  return Report;
};
