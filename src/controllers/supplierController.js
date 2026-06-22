const asyncHandler = require("../utils/asyncHandler");
const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");
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

  const suppliers = await Supplier.find(filter).sort({ supplierName: 1 });
  res.json(suppliers);
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

  emitInventoryUpdate({ area: "suppliers", action: "created", supplierId: supplier._id });
  res.status(201).json(supplier);
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
  emitInventoryUpdate({ area: "suppliers", action: "updated", supplierId: supplier._id });
  res.json(supplier);
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  emitInventoryUpdate({ area: "suppliers", action: "deleted", supplierId: supplier._id });
  res.json({ message: "Supplier deleted" });
});

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
