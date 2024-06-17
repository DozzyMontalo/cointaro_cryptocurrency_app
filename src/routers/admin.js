const express = require("express");
const axios = require("axios");
const router = new express.Router();
const User = require("../model/user");
const Task = require("../model/task");
const Message = require("../model/message");
const Transaction = require("../model/transaction");
const { auth, isAdmin } = require("../middleware/auth");
const platformConfig = require("../utils/PlatformConfig");
const AdminTransaction = require("../model/Admin-transaction");

//Messages Get form router
router.get("/messages/create", async (req, res) => {
  try {
    const users = await User.find()

    // Prepare the form data for task creation
    const formData = {
        user: users.map(user => ({
          id: user._id,
        })),
        type: "",
        body: "",
        timestamp: Date.now(),  
    };

    res.json(formData);
  } catch (error) {
    console.error("Failed to fetch form data:", error);
    res.status(500).json({ error: "Failed to fetch form data" });
  }
});

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
      type,
      body,
      timestamp: new Date(),
    });

    await newMessage.save();

    res.json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

//Get Transaction form
router.get("/admin/send/create", async (req, res) => {
  try {
    const users = await User.find()
    // Prepare the form data for task creation
    const formData = {
        sender: users.map(user => ({
          id: user._id,
        })),
        amount,
        network: "",
        walletAddress: "",
        coin: "",  
    };

    res.json(formData);
  } catch (error) {
    console.error("Failed to fetch form data:", error);
    res.status(500).json({ error: "Failed to fetch form data" });
  }
});


//Admin route for processing of user transaction ... pls see route for status update below
router.post("/admin/user/send", auth, isAdmin, async (req, res) => {
  const { coin, amount, network, walletAddress, senderId } = req.body;
  const user = req.user;

  // Input validation
  if (!coin || !amount || !network || !walletAddress) {
    return res.status(400).send("Please provide all the required information.");
  }

  try {
    // Get the sender's user account
    const sender = await User.findById(senderId);
    if (!sender) {
      throw new Error("Sender user not found");
    }

    // Check if the sender has enough balance to send
    if (
      !sender.hasBalance(coin._id) ||
      sender.getBalance(coin._id).value < amount
    ) {
      throw new Error("Insufficient balance to send");
    }

    // Transfer the coins to the recipient's wallet address
    if (network === "cointaro") {
      // Transfer to recipient's wallet on the same platform
      await sendWithinPlatform(coin, amount, walletAddress, senderId);
    } else {
      // Transfer to recipient's wallet on another platform
      await transferToAnotherPlatform(
        coin,
        amount,
        network,
        walletAddress,
        senderId
      );
    }

    // Save the admin transaction
    const adminTransaction = new AdminTransaction({
      coin,
      amount,
      walletAddress,
      senderId,
      owner: user._id
    });
    await adminTransaction.save();

    res.status(200).send("Coins transferred successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while processing the send request.");
  }
});

//Router for getting incomplete transactions
router.get("/incompleteTransaction", isAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: "pending" })
      .populate("sender", "name")
      .populate("recipient", "name")
      .exec();

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error retrieving pending transactions:", error);
    throw error;
  }
});

//Route to complete a specific transaction
router.post("/completeTransaction/:id", auth, isAdmin, async (req, res) => {
  const transactionId = req.params.id;
  try {
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      throw new Error("Transaction not found");
    }
    //Transaction processing can be placed here
    // Update the transaction status to completed
    transaction.status = "completed";
    await transaction.save();

    console.log("Transaction completed successfully.");
  } catch (error) {
    console.error("Error completing transaction:", error);
    throw error;
  }
});

//Get Task form router
router.get("/tasks/create", async (req, res) => {
  try {

    const users = await User.find()
    // Prepare the form data for task creation
    const formData = {
        description: "",
        completed: false,
        owner: users.map(user => ({
          id: user._id,
        })),
        timestamp: Date.now(),
    };

    res.json(formData);
  } catch (error) {
    console.error("Failed to fetch form data:", error);
    res.status(500).json({ error: "Failed to fetch form data" });
  }
});

// POST route to create a new Simple-Earn task and send it to a user
router.post("/tasks", isAdmin, async (req, res) => {
  const { description, recipientId } = req.body;

  try {
    const task = new Task({
      description,
      owner: recipientId,
    });

    // Save the task to the database
    await task.save();

    // Create a new message to send the task to the recipient
    const message = new Message({
      user: recipientId,
      type: "Simple Earn", // Set the message type
      message: `You have been assigned a new task: ${description}`, // Set the message content
    });

    // Save the message to the database
    await message.save();

    res.status(201).json({ task, message });
  } catch (error) {
    console.error("Failed to create task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Transfer coins within the same platform
async function sendWithinPlatform(coin, amount, walletAddress) {
  try {
    // Find the recipient user based on the wallet address
    const recipient = await User.findOne({
      walletAddress,
    }).populate("balances.token"); // Populate the balances field with Token documents

    if (!recipient) {
      throw new Error("Recipient user not found");
    }
    // Update the recipient's balance
    await recipient.setBalance(
      coin._id,
      (recipient.getBalance(coin._id) ).value + amount
    );

    // Update the recipient's balance in the database
    await recipient.save();

    console.log(
      `Transfer of ${amount} ${coin} to ${walletAddress} completed successfully.`
    );
  } catch (error) {
    console.error("Error transferring within the same platform:", error);
    throw error;
  }
}

//External

// Transfer coins to recipient's wallet on the specified platform
async function transferToAnotherPlatform(
  coin,
  amount,
  network,
  senderId,
  walletAddress
) {
  try {
    const sender = await User.findById(senderId);
    if (!sender) {
      return res
        .status(404)
        .json({ success: false, error: "sender not found" });
    }
    // Get the API URL for the specified network
    const platformApiUrl = getPlatformApiUrl(network);
    if (!platformApiUrl) {
      throw new Error(`Unsupported network: ${network}`);
    }
    //To make an HTTP request to the platform's API
    const response = await axios.post(platformApiUrl, {
      coin,
      amount,
      senderWalletAddress: sender.walletAddress,
      recipientAddress: walletAddress,
    });
    //Handle the transfer result and return it
    const transferResult = response.data;
    return transferResult;
  } catch (error) {
    console.error("Error transferring to another platform", error.message);
    throw error;
  }
}

// Helper function to get the API URL for a given network/platform
function getPlatformApiUrl(network) {
  // Return the API URL for the specified network/platform
  return platformConfig[network] || null;
}

module.exports = router;
