const asyncHandler = require("../utils/asyncHandler");
const Item = require("../models/Item");
const StockTransaction = require("../models/StockTransaction");
const { paginatedResponse } = require("../utils/pagination");
const { emitInventoryUpdate } = require("../utils/realtime");

const getItems = asyncHandler(async (req, res) => {
  const { search, category, status, lowStock } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { itemName: new RegExp(search, "i") },
      { category: new RegExp(search, "i") },
      { location: new RegExp(search, "i") }
    ];
  }

  if (lowStock === "true") {
    filter.$expr = { $lte: ["$currentStock", "$minimumStock"] };
  }

  return paginatedResponse({
    req,
    res,
    query: Item.find(filter).sort({ itemName: 1 }),
    countQuery: Item.countDocuments(filter)
  });
});

const getLowStockItems = asyncHandler(async (req, res) => {
  const items = await Item.find({
    status: "active",
    $expr: { $lte: ["$currentStock", "$minimumStock"] }
  }).sort({ currentStock: 1 });

  res.json(items);
});

const getItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  const transactions = await StockTransaction.find({ itemId: item._id })
    .populate("performedBy", "name role")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ item, transactions });
});

const createItem = asyncHandler(async (req, res) => {
  const { itemName, category, unit, currentStock, minimumStock, location, description, status } = req.body;

  if (!itemName || !category || !unit) {
    return res.status(400).json({ message: "Item name, category, and unit are required" });
  }

  const item = await Item.create({
    itemName,
    category,
    unit,
    currentStock: Number(currentStock || 0),
    minimumStock: Number(minimumStock || 0),
    location,
    description,
    status: status || "active"
  });

  res.status(201).json(item);
  emitInventoryUpdate({ area: "items", areas: ["items", "dashboard", "reports"], action: "created", itemId: item._id });
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  const allowed = ["itemName", "category", "unit", "minimumStock", "location", "description", "status"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });

  if (req.body.currentStock !== undefined) {
    return res.status(400).json({ message: "Stock can only be changed through purchases, donations, issues, or requests" });
  }

  await item.save();
  res.json(item);
  emitInventoryUpdate({ area: "items", areas: ["items", "dashboard", "reports"], action: "updated", itemId: item._id });
});

const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findByIdAndDelete(req.params.id);

  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  res.json({ message: "Item deleted" });
  emitInventoryUpdate({ area: "items", areas: ["items", "dashboard", "reports"], action: "deleted", itemId: item._id });
});

module.exports = { getItems, getLowStockItems, getItem, createItem, updateItem, deleteItem };
