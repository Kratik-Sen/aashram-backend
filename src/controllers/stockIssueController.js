const asyncHandler = require("../utils/asyncHandler");
const { adjustStock, toPositiveNumber } = require("../utils/stock");
const Item = require("../models/Item");
const Department = require("../models/Department");
const StockIssue = require("../models/StockIssue");
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

const getIssues = asyncHandler(async (req, res) => {
  const { itemId, departmentId, startDate, endDate } = req.query;
  const filter = {
    ...buildDateFilter("issueDate", startDate, endDate)
  };

  if (itemId) filter.itemId = itemId;
  if (departmentId) filter.issuedToDepartment = departmentId;

  return paginatedResponse({
    req,
    res,
    query: StockIssue.find(filter)
      .populate("itemId", "itemName category unit")
      .populate("issuedToDepartment", "name")
      .populate("issuedBy", "name")
      .sort({ issueDate: -1, createdAt: -1 }),
    countQuery: StockIssue.countDocuments(filter)
  });
});

const getIssue = asyncHandler(async (req, res) => {
  const issue = await StockIssue.findById(req.params.id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("issuedToDepartment", "name")
    .populate("issuedBy", "name role");

  if (!issue) return res.status(404).json({ message: "Issue not found" });
  res.json(issue);
});

const createIssue = asyncHandler(async (req, res) => {
  const { itemId, quantity, issuedToDepartment, purpose, issueDate, note } = req.body;

  if (!itemId || !quantity || !issuedToDepartment || !purpose) {
    return res.status(400).json({ message: "Item, quantity, department, and purpose are required" });
  }

  const parsedQuantity = toPositiveNumber(quantity);
  const [item, department] = await Promise.all([
    Item.findById(itemId),
    Department.findById(issuedToDepartment)
  ]);

  if (!item) return res.status(404).json({ message: "Item not found" });
  if (!department) return res.status(404).json({ message: "Department not found" });
  if (item.currentStock < parsedQuantity) {
    return res.status(400).json({ message: `Insufficient stock. Available stock is ${item.currentStock}` });
  }

  const issue = await StockIssue.create({
    itemId,
    quantity: parsedQuantity,
    issuedToDepartment,
    issuedBy: req.user._id,
    purpose,
    issueDate: issueDate || Date.now(),
    note
  });

  await adjustStock({
    itemId,
    type: "OUT",
    source: "Issue",
    quantity: parsedQuantity,
    performedBy: req.user._id,
    relatedModel: "StockIssue",
    relatedId: issue._id,
    note: note || purpose,
    suppressRealtime: true
  });

  const populated = await StockIssue.findById(issue._id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("issuedToDepartment", "name")
    .populate("issuedBy", "name");

  res.status(201).json(populated);
  emitInventoryUpdate({
    area: "issues",
    areas: ["issues", "items", "stock", "dashboard", "reports", "departments"],
    action: "created",
    issueId: issue._id,
    itemId,
    departmentId: issuedToDepartment
  });
});

module.exports = { getIssues, getIssue, createIssue };
