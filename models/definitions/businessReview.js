module.exports = (sequelize, DataTypes) => {
  const BusinessReview = sequelize.define(
    "BusinessReview",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      /** 1–5 stars */
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: "BusinessReviews",
      timestamps: true,
      indexes: [
        { fields: ["businessId"] },
        { fields: ["createdByUserId"] },
        {
          unique: true,
          fields: ["businessId", "createdByUserId"],
          name: "business_reviews_business_user_unique",
        },
      ],
    },
  );

  return BusinessReview;
};
