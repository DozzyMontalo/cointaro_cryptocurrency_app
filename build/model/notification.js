const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the Message model
const notificationSchema = new Schema({
  type: {
    type: String,
  },

  message: {
    type: String,
    required: true,
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
  },

  owner: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "User"
  }
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;

