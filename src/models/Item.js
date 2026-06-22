const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    unit: {
      type: String,
      required: true,
      trim: true
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0
    },
    minimumStock: {
      type: Number,
      default: 0,
      min: 0
    },
    location: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

itemSchema.index({ itemName: "text", category: "text", location: "text" });
itemSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model("Item", itemSchema);
