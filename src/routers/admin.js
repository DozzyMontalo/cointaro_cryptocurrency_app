const express = require("express");
const router = new express.Router();
const User = require("../model/user");
const Message = require("../model/message");
const { isAdmin } = require("../middleware/auth");

//Admin Message and task sending route
router.post("/admin/messages", isAdmin, async (req, res) => {
  const { type, message, userId } = req.body;

  if (!type || !message || !userId) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const newMessage = new Message({
      user: userId,
      type: task,
      message,
      timestamp: new Date(),
    });

    await newMessage.save();

    res.json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

module.exports = router;
