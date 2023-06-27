const express = require("express");
const Token = require("../model/token");
const axios = require("axios");
const { auth } = require("../middleware/auth");
const router = new express.Router();

const tokenIds = await Token.find().distinct("_id");
const tokenIdsString = tokenIds.join(",");

//Route for getting the initial balance of all cryptocurrencies owned by a user
router.get("/balance", auth, async (req, res) => {
  const user = req.user; // Retrieve the user from the auth
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: tokenIdsString,
          vs_currencies: "usd",
        },
      }
    );

    const tokenPrices = response.data;

    const tokens = user.balances.map((token) => {
      const tokenPrice = tokenPrices[token.name.toLowerCase()];
      if (tokenPrice && tokenPrice.usd) {
        const usdValue = token.value * tokenPrice.usd;
        return {
          name: token.name,
          value: token.value,
          usdValue,
        };
      }
      return {
        name: token.name,
        value: token.value,
        usdValue: 0,
      };
    });

    const totalBalance = tokens.reduce((acc, token) => acc + token.usdValue, 0);

    res.json({ totalBalance, tokens });
  } catch (error) {
    console.error("Error fetching token prices:", error);
    res.status(500).json({ error: "Failed to fetch token prices" });
  }
});

//Route for Buy and Sell transactions
//Note that this router might not give the desired output, since it's not within descriptions
router.post("/transaction", auth, async (req, res) => {
  const { tokenName, amount, type } = req.body;
  const user = req.user; // Retrieve the user from auth

  if (!tokenName || !amount || !type) {
    return res.status(400).send("Please fill in all the required fields.");
  }
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: tokenName.toLowerCase(),
          vs_currencies: "usd",
        },
      }
    );

    const usdValue = response.data[tokenName.toLowerCase()].usd;

    // Find the token in the user's balances or add a new token if it doesn't exist
    const tokenIndex = user.balances.findIndex(
      (token) => token.name.toLowerCase() === tokenName.toLowerCase()
    );

    const coinBalance = await user.getUserBalance(tokenName);
    const convertedValue = coinBalance * usdValue;

    const newTokenValue = amount / usdValue;

    if (tokenIndex !== -1) {
      if (type === "buy" && convertedValue > amount) {
        convertedValue -= amount;
        await user.setBalance(tokenName._id, coinBalance + newTokenValue);
      } else if (type === "sell" && convertedValue >= amount) {
        convertedValue += amount;
        await user.setBalance(tokenName._id, coinBalance - newTokenValue);
      }
    } else {
      user.balances.push({ token: tokenName._id, value: 0 });
    }

    await user.save(); // Save the updated user to the database

    res.json({ success: true });
  } catch (error) {
    console.error("Error fetching token price:", error);
    res.status(500).json({ error: "Failed to fetch token price" });
  }
});

// Endpoint to retrieve the available balances
router.get("/balances", auth, (req, res) => {
  const user = req.user;
  res.json({ balances: user.balances });
});

//for the chart implementation, you can use the total balance router above, which uses coinGecko api OR you twist up
//things to your taste by using the commented router below

// const tokenBalances = [
//   { name: "BTC", balance: 10, color: "rgba(255, 99, 132, 0.6)" },
//   { name: "BUSD", balance: 20, color: "rgba(54, 162, 235, 0.6)" },
//   { name: "ETH", balance: 15, color: "rgba(255, 206, 86, 0.6)" },
//   { name: "BNB", balance: 5, color: "rgba(75, 192, 192, 0.6)" },
// ];

// router.get("/token-balances", (req, res) => {
//   res.json(tokenBalances);
// });

module.exports = router;
