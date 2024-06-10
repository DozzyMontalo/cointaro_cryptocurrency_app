const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("../model/user");


const adminTransactionShema = new Schema({
    senderId: {type: Schema.Types.ObjectId, ref: "User"},
    amount: {type: Number, required: true, trim: true},
    network:{type: String},
    walletAddress: {type: String, required: true},
    coin:{type: String, required: true},
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        validate: {
          validator: async function(value) {
            // If owner is provided, check if the referenced user is an admin
            if (value) {
              const user = await User.findById(value);
              return user && user.role === 'admin';
            }
            // If no owner is provided, the validation passes
            return true;
          },
          message: "owner must reference a user with role 'admin'"
        }
      }
    
})

const AdminTransaction = mongoose.model("AdminTransaction", adminTransactionShema)

module.exports = AdminTransaction;