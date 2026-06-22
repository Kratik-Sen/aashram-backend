const mongoose = require("mongoose");

const stockTransactionSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true
    },
    type: {
      type: String,
      enum: ["IN", "OUT"],
      required: true
    },
    source: {
      type: String,
      enum: ["Purchase", "Donation", "Issue", "Request"],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01
    },
    previousStock: {
      type: Number,
      required: true,
      min: 0
    },
    newStock: {
      type: Number,
      required: true,
      min: 0
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    relatedModel: {
      type: String,
      enum: ["Purchase", "Donation", "StockIssue", "Request"]
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId
    },
    note: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

stockTransactionSchema.index({ itemId: 1, createdAt: -1 });
stockTransactionSchema.index({ source: 1, type: 1 });

module.exports = mongoose.model("StockTransaction", stockTransactionSchema);
