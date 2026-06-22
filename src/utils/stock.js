const Item = require("../models/Item");
const StockTransaction = require("../models/StockTransaction");
const { emitInventoryUpdate } = require("./realtime");

const toPositiveNumber = (value, fieldName = "quantity") => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    const error = new Error(`${fieldName} must be greater than 0`);
    error.statusCode = 400;
    throw error;
  }
  return number;
};

const adjustStock = async ({
  itemId,
  type,
  source,
  quantity,
  performedBy,
  relatedModel,
  relatedId,
  note = "",
  suppressRealtime = false
}) => {
  const parsedQuantity = toPositiveNumber(quantity);
  const item = await Item.findById(itemId);

  if (!item) {
    const error = new Error("Item not found");
    error.statusCode = 404;
    throw error;
  }

  const previousStock = item.currentStock;
  const newStock = type === "IN" ? previousStock + parsedQuantity : previousStock - parsedQuantity;

  if (newStock < 0) {
    const error = new Error(`Insufficient stock. Available stock is ${previousStock}`);
    error.statusCode = 400;
    throw error;
  }

  item.currentStock = newStock;
  await item.save();

  const transaction = await StockTransaction.create({
    itemId: item._id,
    type,
    source,
    quantity: parsedQuantity,
    previousStock,
    newStock,
    performedBy,
    relatedModel,
    relatedId,
    note
  });

  if (!suppressRealtime) {
    emitInventoryUpdate({
      area: "stock",
      areas: ["stock", "items", "dashboard", "reports"],
      itemId: item._id,
      type,
      source,
      quantity: parsedQuantity
    });
  }

  return { item, transaction };
};

module.exports = { adjustStock, toPositiveNumber };
