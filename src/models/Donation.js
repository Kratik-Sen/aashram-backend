const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donorName: {
      type: String,
      required: true,
      trim: true
    },
    donorPhone: {
      type: String,
      trim: true,
      default: ""
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true
    },
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
    quantity: {
      type: Number,
      required: true,
      min: 0.01
    },
    unit: {
      type: String,
      required: true,
      trim: true
    },
    donationDate: {
      type: Date,
      default: Date.now
    },
    image: {
      url: String,
      publicId: String
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

donationSchema.index({ donationDate: -1, itemId: 1, category: 1 });

module.exports = mongoose.model("Donation", donationSchema);
