const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the SendRequest schema
const transactionSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    coin: { type: Schema.Types.ObjectId, ref: "Token", required: true },
    walletAddress: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
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
