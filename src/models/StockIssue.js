const mongoose = require("mongoose");

const stockIssueSchema = new mongoose.Schema(
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
    issuedToDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    purpose: {
      type: String,
      trim: true,
      required: true
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

stockIssueSchema.index({ issueDate: -1, itemId: 1, issuedToDepartment: 1 });

module.exports = mongoose.model("StockIssue", stockIssueSchema);
