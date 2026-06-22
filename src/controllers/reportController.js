const asyncHandler = require("../utils/asyncHandler");
const Item = require("../models/Item");
const Purchase = require("../models/Purchase");
const StockIssue = require("../models/StockIssue");
const Donation = require("../models/Donation");
const StockTransaction = require("../models/StockTransaction");

const dateRange = (field, startDate, endDate) => {
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

const stockReport = asyncHandler(async (req, res) => {
  const { category, status } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;

  const items = await Item.find(filter).sort({ category: 1, itemName: 1 });
  res.json(items);
});

const purchaseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, itemId, supplierId } = req.query;
  const filter = { ...dateRange("purchaseDate", startDate, endDate) };
  if (itemId) filter.itemId = itemId;
  if (supplierId) filter.supplierId = supplierId;

  const rows = await Purchase.find(filter)
    .populate("itemId", "itemName category unit")
    .populate("supplierId", "supplierName")
    .populate("purchasedBy", "name")
    .sort({ purchaseDate: -1 });

  res.json(rows);
});

const issueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, itemId, departmentId } = req.query;
  const filter = { ...dateRange("issueDate", startDate, endDate) };
  if (itemId) filter.itemId = itemId;
  if (departmentId) filter.issuedToDepartment = departmentId;

  const rows = await StockIssue.find(filter)
    .populate("itemId", "itemName category unit")
    .populate("issuedToDepartment", "name")
    .populate("issuedBy", "name")
    .sort({ issueDate: -1 });

  res.json(rows);
});

const donationReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, category, itemId } = req.query;
  const filter = { ...dateRange("donationDate", startDate, endDate) };
  if (category) filter.category = category;
  if (itemId) filter.itemId = itemId;

  const rows = await Donation.find(filter)
    .populate("itemId", "itemName category unit")
    .populate("recordedBy", "name")
    .sort({ donationDate: -1 });

  res.json(rows);
});

const lowStockReport = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = {
    status: "active",
    $expr: { $lte: ["$currentStock", "$minimumStock"] }
  };
  if (category) filter.category = category;

  const rows = await Item.find(filter).sort({ currentStock: 1 });
  res.json(rows);
});

const monthlyExpenseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = dateRange("purchaseDate", startDate, endDate);

  const rows = await Purchase.aggregate([
    { $match: filter.purchaseDate ? { purchaseDate: filter.purchaseDate } : {} },
    {
      $group: {
        _id: {
          year: { $year: "$purchaseDate" },
          month: { $month: "$purchaseDate" }
        },
        totalExpense: { $sum: "$totalPrice" },
        purchases: { $sum: 1 },
        quantity: { $sum: "$quantity" }
      }
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } }
  ]);

  res.json(rows.map((row) => ({
    month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
    totalExpense: row.totalExpense,
    purchases: row.purchases,
    quantity: row.quantity
  })));
});

const departmentUsageReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = dateRange("issueDate", startDate, endDate);

  const rows = await StockIssue.aggregate([
    { $match: filter.issueDate ? { issueDate: filter.issueDate } : {} },
    {
      $group: {
        _id: "$issuedToDepartment",
        totalQuantity: { $sum: "$quantity" },
        issueCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "department"
      }
    },
    { $unwind: "$department" },
    { $sort: { totalQuantity: -1 } }
  ]);

  res.json(rows.map((row) => ({
    department: row.department.name,
    totalQuantity: row.totalQuantity,
    issueCount: row.issueCount
  })));
});

const transactionsReport = asyncHandler(async (req, res) => {
  const { itemId, type, source, startDate, endDate } = req.query;
  const filter = { ...dateRange("createdAt", startDate, endDate) };
  if (itemId) filter.itemId = itemId;
  if (type) filter.type = type;
  if (source) filter.source = source;

  const rows = await StockTransaction.find(filter)
    .populate("itemId", "itemName category unit")
    .populate("performedBy", "name role")
    .sort({ createdAt: -1 });

  res.json(rows);
});

module.exports = {
  stockReport,
  purchaseReport,
  issueReport,
  donationReport,
  lowStockReport,
  monthlyExpenseReport,
  departmentUsageReport,
  transactionsReport
};
