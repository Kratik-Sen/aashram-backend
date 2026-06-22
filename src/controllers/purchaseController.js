const asyncHandler = require("../utils/asyncHandler");
const { uploadToCloudinary } = require("../config/cloudinary");
const { adjustStock, toPositiveNumber } = require("../utils/stock");
const Item = require("../models/Item");
const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");

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

const getPurchases = asyncHandler(async (req, res) => {
  const { itemId, supplierId, startDate, endDate } = req.query;
  const filter = {
    ...buildDateFilter("purchaseDate", startDate, endDate)
  };

  if (itemId) filter.itemId = itemId;
  if (supplierId) filter.supplierId = supplierId;

  const purchases = await Purchase.find(filter)
    .populate("itemId", "itemName category unit")
    .populate("supplierId", "supplierName phone")
    .populate("purchasedBy", "name")
    .sort({ purchaseDate: -1, createdAt: -1 });

  res.json(purchases);
});

const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("supplierId", "supplierName phone email")
    .populate("purchasedBy", "name role");

  if (!purchase) return res.status(404).json({ message: "Purchase not found" });
  res.json(purchase);
});

const createPurchase = asyncHandler(async (req, res) => {
  const { itemId, quantity, unitPrice, supplierId, billNumber, purchaseDate, note } = req.body;

  if (!itemId || !quantity || unitPrice === undefined || !supplierId) {
    return res.status(400).json({ message: "Item, quantity, unit price, and supplier are required" });
  }

  const parsedQuantity = toPositiveNumber(quantity);
  const parsedUnitPrice = Number(unitPrice);
  if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
    return res.status(400).json({ message: "Unit price must be 0 or greater" });
  }

  const [item, supplier] = await Promise.all([
    Item.findById(itemId),
    Supplier.findById(supplierId)
  ]);

  if (!item) return res.status(404).json({ message: "Item not found" });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  let billImage;
  if (req.file) {
    billImage = await uploadToCloudinary(req.file.buffer, "aashram-inventory/bills");
  }

  const purchase = await Purchase.create({
    itemId,
    quantity: parsedQuantity,
    unitPrice: parsedUnitPrice,
    totalPrice: parsedQuantity * parsedUnitPrice,
    supplierId,
    billNumber,
    billImage,
    purchaseDate: purchaseDate || Date.now(),
    purchasedBy: req.user._id,
    note
  });

  await adjustStock({
    itemId,
    type: "IN",
    source: "Purchase",
    quantity: parsedQuantity,
    performedBy: req.user._id,
    relatedModel: "Purchase",
    relatedId: purchase._id,
    note: note || `Purchase ${billNumber || purchase._id}`
  });

  const populated = await Purchase.findById(purchase._id)
    .populate("itemId", "itemName category unit currentStock")
    .populate("supplierId", "supplierName")
    .populate("purchasedBy", "name");

  res.status(201).json(populated);
});

const deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findByIdAndDelete(req.params.id);
  if (!purchase) return res.status(404).json({ message: "Purchase not found" });

  res.json({ message: "Purchase deleted. Existing stock transactions were preserved for audit history." });
});

module.exports = { getPurchases, getPurchase, createPurchase, deletePurchase };
