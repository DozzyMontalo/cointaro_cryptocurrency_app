const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the Token schema
const tokenSchema = new Schema({
  name: { type: String, required: true, trim: true },
  network: { type: String, required: true, trim: true },
  value: { type: Number, default: 0 },
});

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
