const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true
    },
    billNumber: {
      type: String,
      trim: true,
      default: ""
    },
    billImage: {
      url: String,
      publicId: String
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    purchasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    note: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

purchaseSchema.index({ purchaseDate: -1, itemId: 1, supplierId: 1 });

module.exports = mongoose.model("Purchase", purchaseSchema);
