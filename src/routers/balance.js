const express = require("express");
const axios = require("axios");
const { auth } = require("../middleware/auth");
const router = new express.Router();

//Route for getting the total balance in USD of all cryptocurrencies owned by a user

router.get("/totalBalances", auth, async (req, res) => {
  try {
    const user = req.user;
    const tokenIds = user.balances.map((balance) => balance.token._id);

    // Fetch token information from coinGecko API
    const tokenData = await fetchTokenData(tokenIds);

    // Calculate the total balances in USD
    const totalBalanceUSD = calculateTotalBalanceUSD(user.balances, tokenData);

    res.json({ balances: totalBalanceUSD });
  } catch (error) {
    console.error("Failed to fetch balances:", error);
    res.status(500).json({ error: "Failed to fetch balances" });
  }
});

// Endpoint to retrieve the respective token balances
router.get("/balances", auth, (req, res) => {
  const user = req.user;
  res.json({ balances: user.balances });
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

// Helper function to fetch token data from an external API or predefined mapping
async function fetchTokenData(tokenIds) {
  const response = await axios.get(
    `https://api.coingecko.com/api/v3/tokens/markets`,
    {
      params: {
        ids: tokenIds.join(","),
        vs_currency: "usd",
      },
    }
  );

  // Extract relevant token data from the API response
  const tokenData = response.data.map((token) => ({
    id: token.id,
    name: token.name,
    symbol: token.symbol,
    price: token.current_price,
  }));

  return tokenData;
}

// Helper function to calculate the total balances in USD
function calculateTotalBalanceUSD(balances, tokenData) {
  let totalBalanceUSD = 0;

  balances.forEach((balance) => {
    const token = tokenData.find(
      (token) => token.id === balance.token._id.toString()
    );
    if (token) {
      const tokenValueUSD = balance.amount * token.price;
      totalBalanceUSD += tokenValueUSD;
    }
  });

  return totalBalanceUSD;
}

module.exports = router;
