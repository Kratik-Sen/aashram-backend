const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
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
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },
    reason: {
      type: String,
      trim: true,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "issued"],
      default: "pending"
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvedAt: Date,
    rejectedAt: Date,
    issuedAt: Date,
    note: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

requestSchema.index({ status: 1, department: 1, createdAt: -1 });

module.exports = mongoose.model("Request", requestSchema);
