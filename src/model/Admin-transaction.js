const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const adminTransactionShema = new Schema({
    senderId: {type: Schema.Types.ObjectId, ref: "User"},
    amount: {type: Number, required: true, trim: true},
    network:{type: String, required: true},
    walletAddress: {type: String, required: true},
    coin:{type: String, required: true}
    
})

const AdminTransaction = mongoose.model("AdminTransaction", adminTransactionShema)

module.exports = AdminTransaction;