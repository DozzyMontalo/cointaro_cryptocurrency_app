const express = require("express");
const router = new express.Router();
const { auth } = require("../middleware/auth");
const Token = require("../model/token");
const User = require("../model/user");
const Transaction = require("../model/transaction");
const sendEmailNotification = require("../utils/email");

const transferFeePercentage = 0.5; // Example exchange fee percentage
const minerFee = 0.001; // Example miner fee

// Calculate the total amount with fees
const calculateTotalAmount = (amount) => {
  const exchangeFee = (amount * transferFeePercentage) / 100;
  return amount + exchangeFee + minerFee;
};

// ...

router.post("/send", auth, async (req, res) => {
  const { coin, recipientWalletAddress, network, amount } = req.body;
  const sender = req.user;

  //input validation
  if (!coin || !recipientWalletAddress || !network || !amount) {
    return res.status(400).send("Please fill in all the required fields.");
  }

  try {
    // Check if the sender has enough balance to send
    if (
      !sender.hasBalance(coin._id) ||
      sender.getTokenBalance(coin) < calculateTotalAmount(amount)
    ) {
      throw new Error("Insufficient balance to send.");
    }

    // Deduct the sent amount from the sender's balance
    await sender.setBalance(
      coin._id,
      sender.getBalance(coin._id) - calculateTotalAmount(amount)
    );

    // Update the sender's balance in the database
    await sender.save();

    const fees = calculateTotalAmount(amount) - amount;

    //find recipient
    try {
      const recipient = await User.findOne({
        walletAddress: recipientWalletAddress,
      });
      if (!recipient) {
        return res.status(404).send("Recipient not found.");
      }
    } catch (error) {
      console.error("Error finding recipient", error);
      return res.status(500).send("error occured while finding recipient");
    }

    // Find the admin
    try {
      const admin = await User.findOne({ role: "admin" });
      if (!admin) {
        return res.status(404).send("Admin not found.");
      }
      //add the fees to admin's balance
      await admin.setBalance(coin._id, admin.getBalance(coin._id) + fees);
    } catch (error) {
      console.error("Error finding admin:", error);
      return res.status(500).send("An error occurred while finding the admin.");
    }

    // Create a transaction record
    const transactionData = {
      sender: sender._id,
      recipient: recipient._id,
      coin: coin._id,
      walletAddress: recipientWalletAddress,
      network: coin.network,
      amount,
      fee: fees,
    };

    // Transfer the coins to the recipient's wallet address
    if (network === "cointaro") {
      // Transfer to recipient's wallet on the same platform
      await transferWithinPlatform(coin, amount, network, walletAddress);
    } else {
      // Transfer to recipient's wallet on another platform
      await transferToAnotherPlatform(coin, amount, network, walletAddress);
    }

    // Save the transaction record
    let transaction;
    try {
      transaction = new Transaction(transactionData);
      await transaction.save();
    } catch (error) {
      console.error("Error saving transaction:", error);
      return res
        .status(500)
        .send("An error occurred while saving the transaction.");
    }

    // Create admin notification object with transaction ID
    const adminNotification = {
      user: sender._id,
      coin,
      walletAddress: recipientWalletAddress,
      network,
      amount,
      transaction: transaction._id,
    };

    // Send an email notification to the admin
    await sendEmailNotification(adminNotification);

    // Send a notification to the admin dashboard
    console.log("Admin notification:", adminNotification);

    res.send(
      "Notification sent to the admin. Transfer completed successfully."
    );
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while processing the send request.");
  }
});

// Endpoint for receiving tokens
router.post("/receive-token", auth, async (req, res) => {
  const { tokenId, amount } = req.body;

  // Validate the tokenId and amount
  if (!tokenId || !amount) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    // Get the token information
    const token = await Token.findById(tokenId);

    if (!token) {
      return res.status(400).json({ error: "Invalid token" });
    }

    // Prepare the response payload
    const response = {
      token: token.name,
      network: token.network,
    };

    res.json(response);
  } catch (error) {
    console.error("Failed to recieve token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET transaction history for a user
router.get("/transaction-history", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all transactions where the user is either the sender or the recipient
    const transactions = await Transaction.find({
      $or: [{ sender: userId }, { recipient: userId }],
    }).populate("balances");

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while fetching transaction history.");
  }
});

module.exports = router;
