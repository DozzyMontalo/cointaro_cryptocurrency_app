const express = require("express");
const router = new express.Router();
const Message = require("../model/message");
const Notification = require("../model/notification");
const { auth } = require("../middleware/auth");

router.get("/messages/unread", auth, async (req, res) => {
  const userId = req.user._id;

  try {
    const unreadMessages = await Message.find({ user: userId, isRead: false });

    res.json({ success: true, messages: unreadMessages });
  } catch (error) {
    console.error("Error fetching unread messages:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch unread messages" });
  }
});

router.put("/messages/mark-as-read", auth, async (req, res) => {
  const userId = req.user._id;

  try {
    await Message.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to mark messages as read" });
  }
});

router.get("/notifications/unread", auth, async (req, res) => {
  try {
    // Fetch the logged-in user
    const user = req.user;

    // Find the unread notifications for the user
    const unreadNotifications = await Notification.find({
      _id: { $in: user.unreadNotifications },
    });

    res.status(200).json(unreadNotifications);
  } catch (error) {
    console.error("Error retrieving unread notifications:", error);
    res.status(500).send("Error retrieving unread notifications");
  }
});

router.patch("/notifications/:id/read", auth, async (req, res) => {
  try {
    // Fetch the logged-in user
    const user = req.user;

    // Find the notification by ID
    const notificationId = req.params.id;
    const notification = await Notification.findOne({ _id: notificationId });

    if (!notification) {
      return res.status(404).send("Notification not found");
    }

    // Check if the notification belongs to the user
    if (!user.unreadNotifications.includes(notificationId)) {
      return res
        .status(403)
        .send("You do not have permission to mark this notification as read");
    }

    // Remove the notification from the user's unread notifications array
    user.unreadNotifications = user.unreadNotifications.filter(
      (id) => id !== notificationId
    );

    // Save the updated user
    await user.save();

    res.status(200).send("Notification marked as read");
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).send("Error marking notification as read");
  }
});

module.exports = router;
