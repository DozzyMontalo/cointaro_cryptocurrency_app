const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");
const Token = require("../model/token");
const Transaction = require("../model/transaction");
const sendEmailNotification = require("../utils/email");

// ...

router.post("/send", auth, async (req, res) => {
  // Handle the form submission

  const { coin, walletAddress, network, amount } = req.body;
  const sender = req.user;

  // Perform input validation
  if (!coin || !walletAddress || !network || !amount) {
    return res.status(400).send("Please fill in all the required fields.");
  }

  // Send a notification to the admin
  const adminNotification = {
    user: req.user.id,
    coin,
    walletAddress,
    network,
    amount,
  };

  try {
    // Find the token
    const token = await Token.findOne({ name: coin });

    // Check if the sender has enough balance to send
    if (
      !sender.hasBalance(token._id) ||
      sender.getBalance(token._id) < amount
    ) {
      throw new Error("Insufficient balance to send");
    }
    // Deduct the sent amount from the sender's balance
    sender.setBalance(token._id, sender.getBalance(token._id) - amount);

    // Update the sender's balance in the database
    await sender.save();

    // Transfer the coins to the recipient's wallet address
    if (network === "cointaro") {
      // Transfer to recipient's wallet on the same platform (e.g., Binance)   //add creating a new transaction record
      await transferWithinPlatform(coin, amount, network, walletAddress);
    } else {
      // Transfer to recipient's wallet on another platform
      await transferToAnotherPlatform(coin, amount, network, walletAddress);
    }

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

module.exports = router;
