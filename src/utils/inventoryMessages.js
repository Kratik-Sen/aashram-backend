const areaLabel = (area = "dashboard") => area
  .split(/[-_\s]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const urlByArea = {
  dashboard: "/",
  items: "/items",
  stock: "/items",
  purchases: "/purchases",
  issues: "/issues",
  donations: "/donations",
  requests: "/requests",
  suppliers: "/suppliers",
  departments: "/departments",
  reports: "/reports",
  users: "/users"
};

const formatQty = (quantity, unit) => [quantity, unit].filter((value) => value !== undefined && value !== null && value !== "").join(" ");

const buildInventoryMessage = (event = {}) => {
  const area = event.area || "dashboard";
  const action = event.action || "updated";
  const item = event.itemName || "item";
  const quantity = formatQty(event.quantity, event.unit);
  const department = event.departmentName || "a department";
  const supplier = event.supplierName || "a supplier";
  const donor = event.donorName || "a donor";
  const user = event.userName || "a user";
  const requestedBy = event.requestedByName || "A user";

  const messages = {
    "items:created": `New item ${item} was added to inventory.`,
    "items:updated": `Item ${item} was updated.`,
    "items:deleted": `Item ${item} was deleted.`,
    "purchases:created": `${quantity || "Stock"} of ${item} was purchased from ${supplier}.`,
    "purchases:deleted": `A purchase entry for ${item} was deleted.`,
    "donations:created": `${donor} donated ${quantity || "stock"} of ${item}.`,
    "issues:created": `${quantity || "Stock"} of ${item} was issued to ${department}.`,
    "requests:created": `${requestedBy} requested ${quantity || item} for ${department}.`,
    "requests:approved": `Request for ${quantity || item} was approved.`,
    "requests:rejected": `Request for ${quantity || item} was rejected.`,
    "requests:issued": `Request fulfilled: ${quantity || "stock"} of ${item} was issued to ${department}.`,
    "suppliers:created": `New supplier ${supplier} was added.`,
    "suppliers:updated": `Supplier ${supplier} was updated.`,
    "suppliers:deleted": `Supplier ${supplier} was deleted.`,
    "departments:created": `New department ${department} was added.`,
    "departments:updated": `Department ${department} was updated.`,
    "departments:deleted": `Department ${department} was deleted.`,
    "users:created": `New user ${user} was created.`,
    "users:updated": `User ${user} was updated.`,
    "users:deleted": `User ${user} was deleted.`
  };

  const message = event.message || messages[`${area}:${action}`] || `${areaLabel(area)} ${action}.`;

  return {
    title: event.title || `Aashram ${areaLabel(area)} alert`,
    body: event.body || message,
    message,
    url: event.url || urlByArea[area] || "/",
    tag: event.tag || event.id || `${area}-${Date.now()}`
  };
};

module.exports = { buildInventoryMessage, urlByArea, areaLabel };
