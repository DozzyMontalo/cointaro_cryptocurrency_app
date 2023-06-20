const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendResetEmail } = require("../utils/email");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => {
          if (!validator.isEmail(value)) {
            throw new Error("Email is invalid");
          }
        },
      },
    },
    phone: {
      type: Number,
      required: true,
      trim: true,
      validate: {
        validator: (value) => {
          if (value < 0) {
            throw new Error("phone must be a positive number");
          }
        },
      },
    },
    password: {
      type: String,
      trim: true,
      required: true,
      minLength: 7,
      validate: {
        validator: (value) => {
          if (value.toLowerCase().includes("password")) {
            throw new Error("incorrect password");
          }
        },
      },
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "read-only"],
      default: "read-only",
    },

    referralCode: {
      type: String,
      default: "1234",
      trim: true,
    },
    walletAddress: {
      type: String,
      required: false, //false just for testing
    },
    balances: [{ type: Schema.Types.ObjectId, ref: "Token" }],
    transactions: [{ type: Schema.Types.ObjectId, ref: "Transaction" }],
    notifications: [{ type: Schema.Types.ObjectId, ref: "Notification" }],
    unreadNotifications: [{ type: Schema.Types.ObjectId, ref: "Notification" }],
    age: {
      type: Number,
      default: 0,
      validate: {
        validator: (value) => {
          if (value < 0) {
            throw new Error("Age must be a positive number");
          }
        },
      },
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      }, //an object with the token property. to access token, use token.token
    ],
    resetToken: {
      type: String,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);

  user.tokens = user.tokens.concat({ token });
  await user.save();

  return token;
};

userSchema.methods.generateResetToken = async function () {
  const user = this;
  const resetToken = jwt.sign(
    { _id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  user.resetToken = resetToken;
  await user.save();

  return resetToken;
};

userSchema.methods.getUserBalance = async (coin) => {
  const user = this;
  const balance = user.balances.find((item) => item.coin === coin);
  // Check if the balance for the coin exists
  if (!balance) {
    throw new Error(`Balance not found for coin: ${coin}`);
  }
  return balance.balance;
};
//methods for manipulating the balances field
userSchema.methods.hasBalance = function (tokenId) {
  const user = this;
  return user.balances.some((balance) => balance.equals(tokenId));
};

userSchema.methods.getBalance = function (tokenId) {
  return this.balances.find((balance) => balance.equals(tokenId));
};

userSchema.methods.setBalance = function (tokenId, amount) {
  const balance = this.balances.find((balance) => balance.equals(tokenId));
  if (balance) {
    // Update existing balance
    balance.value = amount;
  } else {
    // Create new balance
    this.balances.push({ token: tokenId, value: amount });
  }
};

userSchema.statics.findByCredentials = async function (password, emailOrPhone) {
  const User = this;
  let user;

  // Check if the input is an email or phone number
  const isEmail = /^\S+@\S+\.\S+$/.test(emailOrPhone);
  const query = isEmail ? { email: emailOrPhone } : { phone: emailOrPhone };

  // Find the user based on the constructed query
  user = await User.findOne(query);

  if (!user) {
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    // Increment the loginAttempts field if the user exists and password is incorrect
    user.loginAttempts += 1;
    await user.save();

    if (user.loginAttempts >= 3) {
      // User has exceeded maximum login attempts, Generate reset token
      const resetToken = await user.generateResetToken();

      //send the reset email with the reset token
      await sendResetEmail(user.email, resetToken);

      throw new Error("Maximum login attempts exceeded. Reset email sent.");
    } else {
      // User has entered incorrect password but is not yet locked out
      throw new Error("Incorrect password");
    }
  }

  // Reset the loginAttempts field if the login is successful
  user.loginAttempts = 0;
  await user.save();

  return user;
};

//Hash the plain text password before saving
userSchema.pre("save", async function (next) {
  const user = this;

  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
