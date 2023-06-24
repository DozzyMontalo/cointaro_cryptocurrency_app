const express = require("express");
const Token = require("../model/token");
const axios = require("axios");
const { auth } = require("../middleware/auth");
const router = new express.Router();
const tokenIds = await Token.find().distinct("_id");
const tokenIdsString = tokenIds.join(",");

//Route for getting the balance of all cryptocurrencies owned by a user
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

  if (!tokenName || !amount || type) {
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

    const tokenPrice = response.data[tokenName.toLowerCase()].usd;

    // Find the token in the user's balances or add a new token if it doesn't exist
    const tokenIndex = user.balances.findIndex(
      (token) => token.name.toLowerCase() === tokenName.toLowerCase()
    );
    const coin = await user.getBalance(tokenName._id); //since the intended balance for this transaction is in usd you have to consider modifying this line
    let userBalance = response.data[coin].usd;
    const newTokenValue = amount / tokenPrice;

    if (tokenIndex !== -1) {
      if (type === "buy" && userBalance > amount) {
        userBalance -= amount;
        await user.setBalance(tokenName.id, coin + newTokenValue);
      } else if (type === "sell" && userBalance >= amount) {
        userBalance += amount;
        await user.setBalance(tokenName.id, coin - newTokenValue);
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
