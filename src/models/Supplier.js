const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    address: {
      type: String,
      trim: true,
      default: ""
    },
    itemsSupplied: [{
      type: String,
      trim: true
    }],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  { timestamps: true }
);

supplierSchema.index({ supplierName: "text", phone: "text", email: "text" });

module.exports = mongoose.model("Supplier", supplierSchema);
