const asyncHandler = require("../utils/asyncHandler");
const { uploadToCloudinary } = require("../config/cloudinary");
const { adjustStock, toPositiveNumber } = require("../utils/stock");
const Item = require("../models/Item");
const Donation = require("../models/Donation");
const { paginatedResponse } = require("../utils/pagination");
const { emitInventoryUpdate } = require("../utils/realtime");

const buildDateFilter = (field, startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) {
    const date = new Date(endDate);
    date.setHours(23, 59, 59, 999);
    range.$lte = date;
  }
  return { [field]: range };
};

const getDonations = asyncHandler(async (req, res) => {
  const { itemId, category, startDate, endDate } = req.query;
  const filter = {
    ...buildDateFilter("donationDate", startDate, endDate)
  };

  if (itemId) filter.itemId = itemId;
  if (category) filter.category = category;

  return paginatedResponse({
    req,
    res,
    query: Donation.find(filter)
      .populate("itemId", "itemName category unit currentStock")
      .populate("recordedBy", "name")
      .sort({ donationDate: -1, createdAt: -1 }),
    countQuery: Donation.countDocuments(filter)
  });
});

const getDonation = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("recordedBy", "name role");

  if (!donation) return res.status(404).json({ message: "Donation not found" });
  res.json(donation);
});

const findOrCreateDonationItem = async ({ itemName, category, unit }) => {
  const existing = await Item.findOne({
    itemName: new RegExp(`^${itemName.trim()}$`, "i"),
    category: new RegExp(`^${category.trim()}$`, "i")
  });

  if (existing) return existing;

  return Item.create({
    itemName,
    category,
    unit,
    currentStock: 0,
    minimumStock: 0,
    location: "Donation Store",
    description: "Created automatically from a donation entry"
  });
};

const createDonation = asyncHandler(async (req, res) => {
  const { donorName, donorPhone, itemName, category, quantity, unit, donationDate, note } = req.body;

  if (!donorName || !itemName || !category || !quantity || !unit) {
    return res.status(400).json({ message: "Donor name, item, category, quantity, and unit are required" });
  }

  const parsedQuantity = toPositiveNumber(quantity);
  const item = await findOrCreateDonationItem({ itemName, category, unit });

  const uploadFiles = [
    ...(req.files?.images || []),
    ...(req.files?.image || [])
  ].slice(0, 3);
  const images = uploadFiles.length
    ? await Promise.all(uploadFiles.map((file) => uploadToCloudinary(file.buffer, "aashram-inventory/donations")))
    : [];

  const donation = await Donation.create({
    donorName,
    donorPhone,
    itemId: item._id,
    itemName,
    category,
    quantity: parsedQuantity,
    unit,
    donationDate: donationDate || Date.now(),
    image: images[0],
    images,
    note,
    recordedBy: req.user._id
  });

  await adjustStock({
    itemId: item._id,
    type: "IN",
    source: "Donation",
    quantity: parsedQuantity,
    performedBy: req.user._id,
    relatedModel: "Donation",
    relatedId: donation._id,
    note: note || `Donation from ${donorName}`,
    suppressRealtime: true
  });

  const populated = await Donation.findById(donation._id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("recordedBy", "name");

  res.status(201).json(populated);
  emitInventoryUpdate({
    area: "donations",
    areas: ["donations", "items", "stock", "dashboard", "reports"],
    action: "created",
    donationId: donation._id,
    itemId: item._id
  });
});

module.exports = { getDonations, getDonation, createDonation };
