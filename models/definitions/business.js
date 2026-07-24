module.exports = (sequelize, DataTypes) => {
  const Business = sequelize.define(
    "Business",
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
      /**
       * Fixed v1 enum — see constants/businessCategories.js
       * food | masjid | shops | parks
       */
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      whatsapp: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      coverImageUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isKaBest: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      /** Part 2 reviews foundation — write API later. */
      ratingAvg: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      reviewCount: {
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
      tableName: "Businesses",
      timestamps: true,
      indexes: [
        { fields: ["category"] },
        { fields: ["createdByUserId"] },
        { fields: ["isKaBest"] },
      ],
    },
  );

  return Business;
};
