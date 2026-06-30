const asyncHandler = require("../utils/asyncHandler");
const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");
const { paginatedResponse } = require("../utils/pagination");
const { emitInventoryUpdate } = require("../utils/realtime");

const getSuppliers = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { supplierName: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
      { email: new RegExp(search, "i") }
    ];
  }

  return paginatedResponse({
    req,
    res,
    query: Supplier.find(filter).sort({ supplierName: 1 }),
    countQuery: Supplier.countDocuments(filter)
  });
});

const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  const purchases = await Purchase.find({ supplierId: supplier._id })
    .populate("itemId", "itemName category unit")
    .sort({ purchaseDate: -1 });

  res.json({ supplier, purchases });
});

const createSupplier = asyncHandler(async (req, res) => {
  const { supplierName, phone, email, address, itemsSupplied, status } = req.body;

  if (!supplierName) {
    return res.status(400).json({ message: "Supplier name is required" });
  }

  const supplier = await Supplier.create({
    supplierName,
    phone,
    email,
    address,
    itemsSupplied: Array.isArray(itemsSupplied) ? itemsSupplied : String(itemsSupplied || "").split(",").map((item) => item.trim()).filter(Boolean),
    status: status || "active"
  });

  res.status(201).json(supplier);
  emitInventoryUpdate({ area: "suppliers", areas: ["suppliers", "dashboard", "reports"], action: "created", supplierId: supplier._id, supplierName: supplier.supplierName });
});

const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  ["supplierName", "phone", "email", "address", "status"].forEach((field) => {
    if (req.body[field] !== undefined) supplier[field] = req.body[field];
  });

  if (req.body.itemsSupplied !== undefined) {
    supplier.itemsSupplied = Array.isArray(req.body.itemsSupplied)
      ? req.body.itemsSupplied
      : String(req.body.itemsSupplied).split(",").map((item) => item.trim()).filter(Boolean);
  }

  await supplier.save();
  res.json(supplier);
  emitInventoryUpdate({ area: "suppliers", areas: ["suppliers", "dashboard", "reports"], action: "updated", supplierId: supplier._id, supplierName: supplier.supplierName });
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  res.json({ message: "Supplier deleted" });
  emitInventoryUpdate({ area: "suppliers", areas: ["suppliers", "dashboard", "reports"], action: "deleted", supplierId: supplier._id, supplierName: supplier.supplierName });
});

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
