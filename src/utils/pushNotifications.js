const webpush = require("web-push");
const User = require("../models/User");

const isConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

const configureWebPush = () => {
  if (!isConfigured()) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@aashram.local",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  return true;
};

const areaLabel = (area = "dashboard") => area.charAt(0).toUpperCase() + area.slice(1);

const buildNotificationPayload = (event = {}) => ({
  title: "Aashram Inventory updated",
  body: `${areaLabel(event.area)} ${event.action || "updated"}`,
  url: "/",
  tag: event.id || `${event.area || "inventory"}-${Date.now()}`
});

const removeExpiredSubscription = async (endpoint) => {
  await User.updateMany(
    { "pushSubscriptions.endpoint": endpoint },
    { $pull: { pushSubscriptions: { endpoint } } }
  );
};

const sendPushNotification = async (event) => {
  if (!configureWebPush()) return;

  const users = await User.find({ "pushSubscriptions.0": { $exists: true }, status: "active" }).select("pushSubscriptions");
  const payload = JSON.stringify(buildNotificationPayload(event));

  await Promise.all(users.flatMap((user) => (
    user.pushSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          expirationTime: subscription.expirationTime,
          keys: subscription.keys
        }, payload);
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await removeExpiredSubscription(subscription.endpoint);
        }
      }
    })
  )));
};

module.exports = { isConfigured, sendPushNotification };
