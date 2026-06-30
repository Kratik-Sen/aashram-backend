const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { isConfigured } = require("../utils/pushNotifications");

const getVapidPublicKey = asyncHandler(async (req, res) => {
  res.json({
    enabled: isConfigured(),
    publicKey: process.env.VAPID_PUBLIC_KEY || ""
  });
});

const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, expirationTime, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: "Invalid push subscription" });
  }

  const subscription = {
    endpoint,
    expirationTime: expirationTime ? new Date(expirationTime) : null,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth
    },
    userAgent: req.get("user-agent") || ""
  };

  await User.updateOne(
    { _id: req.user._id },
    { $pull: { pushSubscriptions: { endpoint } } }
  );
  await User.updateOne(
    { _id: req.user._id },
    { $push: { pushSubscriptions: subscription } }
  );

  res.status(201).json({ message: "Push notifications enabled" });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ message: "Subscription endpoint is required" });

  await User.updateOne(
    { _id: req.user._id },
    { $pull: { pushSubscriptions: { endpoint } } }
  );

  res.json({ message: "Push notifications disabled" });
});

module.exports = { getVapidPublicKey, subscribe, unsubscribe };
