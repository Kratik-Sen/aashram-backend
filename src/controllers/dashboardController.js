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

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getPurchaseChart = async (period = "monthly") => {
  const now = new Date();
  const since = new Date(now);
  let group;
  let label;

  if (period === "daily") {
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);
    group = { label: { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } } };
    label = "$_id.label";
  } else if (period === "weekly") {
    since.setDate(since.getDate() - 83);
    since.setHours(0, 0, 0, 0);
    group = {
      year: { $isoWeekYear: "$purchaseDate" },
      week: { $isoWeek: "$purchaseDate" }
    };
    label = {
      $concat: [
        { $toString: "$_id.year" },
        "-W",
        { $cond: [{ $lt: ["$_id.week", 10] }, { $concat: ["0", { $toString: "$_id.week" }] }, { $toString: "$_id.week" }] }
      ]
    };
  } else if (period === "yearly") {
    since.setFullYear(since.getFullYear() - 4);
    since.setMonth(0, 1);
    since.setHours(0, 0, 0, 0);
    group = { year: { $year: "$purchaseDate" } };
    label = { $toString: "$_id.year" };
  } else {
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    group = {
      year: { $year: "$purchaseDate" },
      month: { $month: "$purchaseDate" }
    };
    label = {
      $concat: [
        { $toString: "$_id.year" },
        "-",
        { $cond: [{ $lt: ["$_id.month", 10] }, { $concat: ["0", { $toString: "$_id.month" }] }, { $toString: "$_id.month" }] }
      ]
    };
  }

  const rows = await Purchase.aggregate([
    { $match: { purchaseDate: { $gte: since } } },
    {
      $group: {
        _id: group,
        expense: { $sum: "$totalPrice" },
        purchases: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.label": 1 } },
    {
      $project: {
        _id: 0,
        label,
        expense: 1,
        purchases: 1
      }
    }
  ]);

  return rows;
};

const getDashboard = asyncHandler(async (req, res) => {
  const monthStart = startOfMonth();
  const purchasePeriod = ["daily", "weekly", "monthly", "yearly"].includes(req.query.purchasePeriod)
    ? req.query.purchasePeriod
    : "monthly";

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
    purchaseChart,
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
    getPurchaseChart(purchasePeriod),
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
    purchaseChart,
    monthlyPurchaseChart: purchaseChart,
    purchasePeriod,
    categoryStockChart: categoryStockChart.map((row) => ({
      category: row._id || "Uncategorized",
      stock: row.stock,
      items: row.items
    }))
  });
});

const getDashboardMetric = asyncHandler(async (req, res) => {
  const monthStart = startOfMonth();
  const metric = req.params.metric;

  const handlers = {
    "total-items": async () => ({
      title: "Total Items",
      rows: await Item.find().sort({ itemName: 1 }).limit(100)
    }),
    "low-stock": async () => ({
      title: "Low Stock Items",
      rows: await Item.find({ status: "active", $expr: { $lte: ["$currentStock", "$minimumStock"] } })
        .sort({ currentStock: 1 })
        .limit(100)
    }),
    "purchases-month": async () => ({
      title: "Purchases This Month",
      rows: await Purchase.find({ purchaseDate: { $gte: monthStart, $lte: endOfDay(new Date()) } })
        .populate("itemId", "itemName category unit")
        .populate("supplierId", "supplierName")
        .populate("purchasedBy", "name")
        .sort({ purchaseDate: -1, createdAt: -1 })
        .limit(100)
    }),
    "issued-items": async () => ({
      title: "Issued Items",
      rows: await StockIssue.find()
        .populate("itemId", "itemName category unit")
        .populate("issuedToDepartment", "name")
        .populate("issuedBy", "name")
        .sort({ issueDate: -1, createdAt: -1 })
        .limit(100)
    }),
    donations: async () => ({
      title: "Donations",
      rows: await Donation.find()
        .populate("itemId", "itemName category unit")
        .populate("recordedBy", "name")
        .sort({ donationDate: -1, createdAt: -1 })
        .limit(100)
    }),
    "pending-requests": async () => ({
      title: "Pending Requests",
      rows: await Request.find({ status: "pending" })
        .populate("itemId", "itemName category unit currentStock")
        .populate("requestedBy", "name")
        .populate("department", "name")
        .sort({ createdAt: -1 })
        .limit(100)
    }),
    suppliers: async () => ({
      title: "Suppliers",
      rows: await Supplier.find().sort({ supplierName: 1 }).limit(100)
    }),
    "monthly-expense": async () => ({
      title: "Monthly Expense",
      rows: await Purchase.find({ purchaseDate: { $gte: monthStart, $lte: endOfDay(new Date()) } })
        .populate("itemId", "itemName category unit")
        .populate("supplierId", "supplierName")
        .populate("purchasedBy", "name")
        .sort({ purchaseDate: -1, createdAt: -1 })
        .limit(100)
    })
  };

  const handler = handlers[metric];
  if (!handler) {
    return res.status(404).json({ message: "Dashboard metric not found" });
  }

  res.json(await handler());
});

module.exports = { getDashboard, getDashboardMetric };
