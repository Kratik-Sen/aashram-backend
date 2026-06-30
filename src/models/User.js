const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ["Super Admin", "Store Manager", "Kitchen Staff", "Department Staff", "Viewer"],
      default: "Viewer"
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    pushSubscriptions: [
      {
        endpoint: {
          type: String,
          required: true
        },
        expirationTime: {
          type: Date,
          default: null
        },
        keys: {
          p256dh: {
            type: String,
            required: true
          },
          auth: {
            type: String,
            required: true
          }
        },
        userAgent: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
