const mongoose = require("mongoose");
const User = require("./user");
const Schema = mongoose.Schema;

// Define the Message model
const messageSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: User, require: true },
  type: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
