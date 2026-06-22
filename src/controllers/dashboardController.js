const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const Item = require("../models/Item");
const Purchase = require("../models/Purchase");
const StockIssue = require("../models/StockIssue");
const Donation = require("../models/Donation");
const Request = require("../models/Request");
const Supplier = require("../models/Supplier");

const startOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const getMonthlyPurchaseChart = async () => {
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const rows = await Purchase.aggregate([
    { $match: { purchaseDate: { $gte: since } } },
    {
      $group: {
        _id: {
          year: { $year: "$purchaseDate" },
          month: { $month: "$purchaseDate" }
        },
        expense: { $sum: "$totalPrice" },
        purchases: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  return rows.map((row) => ({
    month: `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
    expense: row.expense,
    purchases: row.purchases
  }));
};

const getDashboard = asyncHandler(async (req, res) => {
  const monthStart = startOfMonth();

  const [
    totalItems,
    lowStockItems,
    purchaseStats,
    issueStats,
    donationStats,
    pendingRequests,
    totalSuppliers,
    recentPurchases,
    recentIssues,
    recentDonations,
    monthlyPurchaseChart,
    categoryStockChart
  ] = await Promise.all([
    Item.countDocuments(),
    Item.find({ status: "active", $expr: { $lte: ["$currentStock", "$minimumStock"] } }).sort({ currentStock: 1 }).limit(8),
    Purchase.aggregate([
      { $match: { purchaseDate: { $gte: monthStart } } },
      { $group: { _id: null, count: { $sum: 1 }, expense: { $sum: "$totalPrice" } } }
    ]),
    StockIssue.aggregate([{ $group: { _id: null, quantity: { $sum: "$quantity" }, count: { $sum: 1 } } }]),
    Donation.aggregate([{ $group: { _id: null, quantity: { $sum: "$quantity" }, count: { $sum: 1 } } }]),
    Request.countDocuments({ status: "pending" }),
    Supplier.countDocuments(),
    Purchase.find()
      .populate("itemId", "itemName category unit")
      .populate("supplierId", "supplierName")
      .populate("purchasedBy", "name")
      .sort({ purchaseDate: -1, createdAt: -1 })
      .limit(6),
    StockIssue.find()
      .populate("itemId", "itemName category unit")
      .populate("issuedToDepartment", "name")
      .populate("issuedBy", "name")
      .sort({ issueDate: -1, createdAt: -1 })
      .limit(6),
    Donation.find()
      .populate("itemId", "itemName category unit")
      .populate("recordedBy", "name")
      .sort({ donationDate: -1, createdAt: -1 })
      .limit(6),
    getMonthlyPurchaseChart(),
    Item.aggregate([
      {
        $group: {
          _id: "$category",
          stock: { $sum: "$currentStock" },
          items: { $sum: 1 }
        }
      },
      { $sort: { stock: -1 } }
    ])
  ]);

  const purchaseSummary = purchaseStats[0] || { count: 0, expense: 0 };
  const issueSummary = issueStats[0] || { quantity: 0, count: 0 };
  const donationSummary = donationStats[0] || { quantity: 0, count: 0 };

  res.json({
    summary: {
      totalItems,
      lowStockItems: lowStockItems.length,
      totalPurchasesThisMonth: purchaseSummary.count,
      totalIssuedItems: issueSummary.quantity,
      totalDonations: donationSummary.count,
      pendingRequests,
      totalSuppliers,
      monthlyExpense: purchaseSummary.expense
    },
    lowStockItems,
    recentPurchases,
    recentIssues,
    recentDonations,
    monthlyPurchaseChart,
    categoryStockChart: categoryStockChart.map((row) => ({
      category: row._id || "Uncategorized",
      stock: row.stock,
      items: row.items
    }))
  });
});

module.exports = { getDashboard };
