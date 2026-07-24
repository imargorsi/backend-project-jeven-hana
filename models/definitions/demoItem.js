module.exports = (sequelize, DataTypes) => {
  const DemoItem = sequelize.define(
    "DemoItem",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "DemoItems",
      timestamps: true,
    }
  );

  return DemoItem;
};
