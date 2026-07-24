module.exports = (sequelize, DataTypes) => {
  const EventGoing = sequelize.define(
    "EventGoing",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "EventGoings",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["eventId", "userId"],
        },
      ],
    }
  );

  return EventGoing;
};
