const express = require("express");
const axios = require("axios");
const { auth } = require("../middleware/auth");
const router = new express.Router();

router.get("/balance", auth, async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: "bitcoin,ethereum,bitcoin-cash,busd",
          vs_currencies: "usd",
        },
      }
    );

    const tokenPrices = response.data;

    const user = req.user; // Retrieve the user from the auth

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

router.post("/transaction", auth, async (req, res) => {
  const { tokenName, amount, type } = req.body;

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

    // const tokenPrice = response.data[tokenName.toLowerCase()].usd; *until needed

    const user = req.user; // Retrieve the user from auth

    // Find the token in the user's balances or add a new token if it doesn't exist
    const tokenIndex = user.balances.findIndex(
      (token) => token.name.toLowerCase() === tokenName.toLowerCase()
    );
    if (tokenIndex !== -1) {
      if (type === "buy") {
        user.balances[tokenIndex].value += amount;
      } else if (type === "sell") {
        user.balances[tokenIndex].value -= amount;
      }
    } else {
      user.balances.push({ name: tokenName, value: amount });
    }

    await user.save(); // Save the updated user to the database

    res.json({ success: true });
  } catch (error) {
    console.error("Error fetching token price:", error);
    res.status(500).json({ error: "Failed to fetch token price" });
  }
});

module.exports = router;
