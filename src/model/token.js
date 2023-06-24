const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const axios = require("axios");

// Define the Token schema
const tokenSchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  network: { type: String, required: true, trim: true },
});

tokenSchema.pre("save", async function (next) {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/list"
    );
    const tokens = response.data.map((token) => ({
      name: token.symbol.toUpperCase(),
      network: token.name,
    }));

    // Update or insert tokens in the Token model
    for (const token of tokens) {
      await Token.findOneAndUpdate({ name: token.name }, token, {
        upsert: true,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
