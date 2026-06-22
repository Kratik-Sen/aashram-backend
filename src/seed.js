require("dotenv").config();
const connectDB = require("./config/db");
const User = require("./models/User");
const Item = require("./models/Item");
const Purchase = require("./models/Purchase");
const StockIssue = require("./models/StockIssue");
const Donation = require("./models/Donation");
const Request = require("./models/Request");
const Supplier = require("./models/Supplier");
const Department = require("./models/Department");
const StockTransaction = require("./models/StockTransaction");
const { adjustStock } = require("./utils/stock");

const departments = [
  "Kitchen",
  "Store",
  "Medical",
  "Cleaning",
  "Office",
  "Guest Room",
  "Religious Hall",
  "Maintenance"
];

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany(),
    Item.deleteMany(),
    Purchase.deleteMany(),
    StockIssue.deleteMany(),
    Donation.deleteMany(),
    Request.deleteMany(),
    Supplier.deleteMany(),
    Department.deleteMany(),
    StockTransaction.deleteMany()
  ]);

  const departmentDocs = await Department.insertMany(
    departments.map((name) => ({
      name,
      description: `${name} department`
    }))
  );

  const departmentByName = Object.fromEntries(departmentDocs.map((department) => [department.name, department]));

  const admin = await User.create({
    name: "Aashram Super Admin",
    email: "admin@aashram.com",
    password: "admin123",
    role: "Super Admin",
    department: departmentByName.Store._id
  });

  const manager = await User.create({
    name: "Store Manager",
    email: "manager@aashram.com",
    password: "manager123",
    role: "Store Manager",
    department: departmentByName.Store._id
  });

  const kitchenStaff = await User.create({
    name: "Kitchen Staff",
    email: "kitchen@aashram.com",
    password: "staff123",
    role: "Kitchen Staff",
    department: departmentByName.Kitchen._id
  });

  const suppliers = await Supplier.insertMany([
    {
      supplierName: "Shree Annapurna Grains",
      phone: "9876543210",
      email: "orders@annapurna.example",
      address: "Main Market Road",
      itemsSupplied: ["Rice", "Wheat Flour", "Pulses"]
    },
    {
      supplierName: "Seva Medical Store",
      phone: "9876501234",
      email: "seva.medical@example.com",
      address: "Temple Street",
      itemsSupplied: ["Medicines", "First Aid"]
    },
    {
      supplierName: "CleanWell Supplies",
      phone: "9876512345",
      email: "cleanwell@example.com",
      address: "Industrial Area",
      itemsSupplied: ["Cleaning Liquid", "Brooms"]
    }
  ]);

  const supplierByName = Object.fromEntries(suppliers.map((supplier) => [supplier.supplierName, supplier]));

  const items = await Item.insertMany([
    {
      itemName: "Basmati Rice",
      category: "Food",
      unit: "kg",
      minimumStock: 120,
      location: "Kitchen Store",
      description: "Daily meal rice stock"
    },
    {
      itemName: "Wheat Flour",
      category: "Food",
      unit: "kg",
      minimumStock: 100,
      location: "Kitchen Store"
    },
    {
      itemName: "Paracetamol",
      category: "Medicine",
      unit: "strips",
      minimumStock: 50,
      location: "Medical Room"
    },
    {
      itemName: "Floor Cleaner",
      category: "Cleaning",
      unit: "liters",
      minimumStock: 25,
      location: "Cleaning Store"
    },
    {
      itemName: "Cotton Blankets",
      category: "Clothes",
      unit: "pieces",
      minimumStock: 40,
      location: "Donation Store"
    },
    {
      itemName: "Incense Sticks",
      category: "Religious Items",
      unit: "boxes",
      minimumStock: 30,
      location: "Religious Hall"
    }
  ]);

  const itemByName = Object.fromEntries(items.map((item) => [item.itemName, item]));

  const purchaseRows = [
    {
      itemId: itemByName["Basmati Rice"]._id,
      quantity: 300,
      unitPrice: 58,
      supplierId: supplierByName["Shree Annapurna Grains"]._id,
      billNumber: "AG-1001",
      purchaseDate: new Date(),
      purchasedBy: manager._id,
      note: "Monthly kitchen stock"
    },
    {
      itemId: itemByName["Wheat Flour"]._id,
      quantity: 180,
      unitPrice: 36,
      supplierId: supplierByName["Shree Annapurna Grains"]._id,
      billNumber: "AG-1002",
      purchaseDate: new Date(),
      purchasedBy: manager._id,
      note: "Roti kitchen stock"
    },
    {
      itemId: itemByName.Paracetamol._id,
      quantity: 50,
      unitPrice: 18,
      supplierId: supplierByName["Seva Medical Store"]._id,
      billNumber: "SM-2201",
      purchaseDate: new Date(),
      purchasedBy: manager._id,
      note: "Medical room refill"
    },
    {
      itemId: itemByName["Floor Cleaner"]._id,
      quantity: 20,
      unitPrice: 90,
      supplierId: supplierByName["CleanWell Supplies"]._id,
      billNumber: "CW-771",
      purchaseDate: new Date(),
      purchasedBy: manager._id,
      note: "Cleaning stock"
    },
    {
      itemId: itemByName["Incense Sticks"]._id,
      quantity: 45,
      unitPrice: 22,
      supplierId: supplierByName["CleanWell Supplies"]._id,
      billNumber: "CW-772",
      purchaseDate: new Date(),
      purchasedBy: admin._id,
      note: "Prayer hall stock"
    }
  ];

  for (const row of purchaseRows) {
    const purchase = await Purchase.create({
      ...row,
      totalPrice: row.quantity * row.unitPrice
    });

    await adjustStock({
      itemId: row.itemId,
      type: "IN",
      source: "Purchase",
      quantity: row.quantity,
      performedBy: row.purchasedBy,
      relatedModel: "Purchase",
      relatedId: purchase._id,
      note: row.note
    });
  }

  const donation = await Donation.create({
    donorName: "Mahesh Sharma",
    donorPhone: "9000011111",
    itemId: itemByName["Cotton Blankets"]._id,
    itemName: "Cotton Blankets",
    category: "Clothes",
    quantity: 60,
    unit: "pieces",
    donationDate: new Date(),
    recordedBy: manager._id,
    note: "Winter seva donation"
  });

  await adjustStock({
    itemId: itemByName["Cotton Blankets"]._id,
    type: "IN",
    source: "Donation",
    quantity: 60,
    performedBy: manager._id,
    relatedModel: "Donation",
    relatedId: donation._id,
    note: "Winter seva donation"
  });

  const issueRows = [
    {
      itemId: itemByName["Basmati Rice"]._id,
      quantity: 110,
      issuedToDepartment: departmentByName.Kitchen._id,
      issuedBy: manager._id,
      purpose: "Daily meals",
      note: "Kitchen issue"
    },
    {
      itemId: itemByName["Floor Cleaner"]._id,
      quantity: 6,
      issuedToDepartment: departmentByName.Cleaning._id,
      issuedBy: manager._id,
      purpose: "Dormitory cleaning",
      note: "Weekly cleaning"
    }
  ];

  for (const row of issueRows) {
    const issue = await StockIssue.create(row);
    await adjustStock({
      itemId: row.itemId,
      type: "OUT",
      source: "Issue",
      quantity: row.quantity,
      performedBy: row.issuedBy,
      relatedModel: "StockIssue",
      relatedId: issue._id,
      note: row.note
    });
  }

  await Request.create([
    {
      itemId: itemByName["Wheat Flour"]._id,
      quantity: 30,
      requestedBy: kitchenStaff._id,
      department: departmentByName.Kitchen._id,
      reason: "Extra visitors for evening meal",
      status: "pending"
    },
    {
      itemId: itemByName["Cotton Blankets"]._id,
      quantity: 10,
      requestedBy: kitchenStaff._id,
      department: departmentByName["Guest Room"]._id,
      reason: "Guest room bedding",
      status: "approved",
      approvedBy: admin._id,
      approvedAt: new Date()
    }
  ]);

  console.log("Seed completed");
  console.log("Default admin: admin@aashram.com / admin123");
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
