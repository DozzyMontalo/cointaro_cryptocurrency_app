const express = require("express");
const router = new express.Router();
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const User = require("../model/user");
const Transaction = require("../model/transaction");
const sendEmailNotification = require("../utils/email");
const { auth, apiAuth } = require("../middleware/auth");

const CHANGELLY_API_URL = "https://api.changelly.com/v1";
const apiKey = "YOUR_CHANGELLY_API_KEY";
const apiSecret = "YOUR_CHANGELLY_API_SECRET";
const exchangeFeePercentage = 0.5; // Example exchange fee percentage
const minerFee = 0.001; // Example miner fee

// Middleware for rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum number of requests allowed within the windowMs timeframe
  message: "Too many requests from this IP, please try again later.",
});

// Calculate the total amount with fees
const calculateTotalAmount = (amount) => {
  const exchangeFee = (amount * exchangeFeePercentage) / 100;
  return amount + exchangeFee + minerFee;
};

// Endpoint to handle the swap request
router.post("/swap", auth, apiAuth, async (req, res) => {
  const { fromToken, toToken, amount, walletAddress } = req.body;
  const user = req.user;

  //input validation
  if (!fromToken || !toToken || !walletAddress || !amount) {
    return res.status(400).send("Please fill in all the required fields.");
  }

  // Send a notification to the admin
  const adminNotification = {
    user: user._id,
    fromToken,
    toToken,
    walletAddress,
    network,
    amount,
  };

  try {
    // Perform the swap with Changelly API
    const response = await axios.post(`${CHANGELLY_API_URL}/transactions`, {
      api_key: apiKey,
      api_secret: apiSecret,
      from: fromToken,
      to: toToken,
      amount,
      address: walletAddress,
    });

    // Verify the response and perform necessary actions
    if (response.status !== 200) {
      return res.status(response.status).json({ error: response.data.message });
    }

    // Deduct the swapped amount plus fees from the "FROM" token balance
    const fromTokenBalanceIndex = user.balances.findIndex(
      (balance) => balance.token === fromToken
    );
    if (
      fromTokenBalanceIndex === -1 ||
      user.balances[fromTokenBalanceIndex].value < amount
    ) {
      return res
        .status(400)
        .json({ error: "Insufficient balance for the FROM token" });
    }
    user.balances[fromTokenBalanceIndex].value -= calculateTotalAmount(amount);

    const fees = calculateTotalAmount(amount) - amount;

    try {
      const admin = await User.findOne({ role: admin });
      if (!admin) {
        return res.status(404).send("Admin not found.");
      }
    } catch (error) {
      console.error("Error getting the admin:", error.message);
      throw error;
    }

    // Add the swapped amount to the "TO" token balance
    const toTokenBalanceIndex = user.balances.findIndex(
      (balance) => balance.token === toToken
    );
    if (toTokenBalanceIndex === -1) {
      user.balances.push({ name: toToken, value: amount });
    } else {
      user.balances[toTokenBalanceIndex].value += amount;
    }

    await user.save(); // Save the updated user to the database

    //Add the deducted fees to admin's token balance
    await admin.setBalance(
      fromToken._id,
      admin.getBalance(fromToken._id) + fees
    );

    await admin.save(); // Update the admins's balance in the database

    // Return the updated balances
    res.json({ balances: user.balances });

    // Send an email notification to the admin
    await sendEmailNotification(adminNotification);

    // Send a notification to the admin dashboard
    console.log("Admin notification:", adminNotification);

    res.send(
      "Notification sent to the admin. Transfer completed successfully."
    );

    // Create a transaction record
    const transactionData = {
      sender: user._id,
      coin: fromToken._id,
      walletAddress,
      network,
      amount,
      fee: fees,
    };

    // Save the transaction record
    const transaction = new Transaction(transactionData);
    await transaction.save();
  } catch (error) {
    console.error("Error performing swap:", error.message);
    throw error;
  }
});

// Endpoint to retrieve the available balances
router.get("/balances", auth, (req, res) => {
  const user = req.user;
  res.json({ balances: user.balance });
});

module.exports = router;
module.exports = limiter;
