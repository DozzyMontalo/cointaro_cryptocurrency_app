const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the SendRequest schema
const transactionSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: false },
    coin: { type: Schema.Types.ObjectId, ref: "Token", required: true },
    walletAddress: {
      type: String,
      required: false,
    },
    
    network: {
      type: String,
      default: "cointaro",
    },

    amount: {
      type: Number,
      required: true,
    },

    fee: {
      type: Number,
      default: 0,
    },

    type: {
      type: String,
      enum: ["buy", "sell"],
    },

    blockNumber: {
      type: Number,
    },

    status: {
      type: String,
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Create the SendRequest model
const Transaction = mongoose.model("Transaction", transactionSchema);

// Export the model
module.exports = Transaction;
