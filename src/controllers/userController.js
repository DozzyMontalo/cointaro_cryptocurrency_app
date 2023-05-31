const User = require("../model/user");
const Notification = require("../model/notification");

//Create user callback function
const userCreate = async (req, res) => {
  const { name, email, phone, password, referralCode } = req.body;

  //Confirm data
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  //Check for duplicate username
  const duplicate = await User.findOne({ name }).lean().exec();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate name" });
  }
  // Check if referral code exists and process the registration
  if (referralCode) {
    processReferralRegistration(referralCode);
  }

  const user = new User(req.body);
  try {
    await user.save();
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (error) {
    res.status(400).send(error.message);
  }
};

//userLogin callback fuction
const userLogin = async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password,
      req.body.phone
    );
    if (!user) {
      throw new Error("Unable to login");
    }
    const token = await user.generateAuthToken();
    res.status(200).send({ user, token });
  } catch (e) {
    res.status(400).send(e.message);
  }
};

//userProfile callback function
const userProfile = async (req, res) => {
  res.send(req.user);
};

//userLogout callback function
const userLogout = async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token != req.token;
    });

    await req.user.save();
    res.send();
  } catch (e) {
    res.status(500).send(e.message);
  }
};

//function to process referral registration
async function processReferralRegistration(referralCode) {
  try {
    // Logic to reward the user who owns the referral code
    //updating their token balance
    console.log(
      `Processing referral registration for user with referral code ${referralCode}`
    );

    // Reward the user with the referral code with $5 equivalent coins
    const rewardAmount = 5; // $5 equivalent coins
    await rewardUser(referralCode, rewardAmount);

    // Send referral notification to the user who owns the referral code
    await sendReferralNotification(referralCode);
  } catch (error) {
    console.error("Error processing referral registration:", error.message);
  }
}

//function to reward the user with coins
async function rewardUser(referralCode, amount) {
  try {
    // Find the user with the referral code
    const user = await User.findOne({ referralCode }).exec();

    if (user) {
      // Find the ETH balance in the user's balances array
      const ethBalance = user.balances.find(
        (balance) => balance.name === "ETH"
      );

      if (ethBalance) {
        // Increment the existing ETH balance
        ethBalance.value += amount;
      } else {
        // Create a new ETH balance
        user.balances.push({ name: "ETH", value: amount });
      }

      // Save the updated user
      await user.save();

      console.log(
        `Rewarding user with referral code ${referralCode} with ${amount} coins`
      );
    } else {
      console.log(`User with referral code ${referralCode} not found`);
    }
  } catch (error) {
    console.error("Error rewarding user:", error.message);
  }
}

//function to send referral notification
async function sendReferralNotification(referralCode) {
  try {
    // Find the user with the referral code
    const user = await User.findOne({ referralCode }).exec();

    if (user) {
      // Create a new referral notification
      const notification = new Notification({
        type: "referral",
        message: "Congratulations! You received a referral reward.",
        timestamp: new Date(),
      });

      // Save the notification to the database
      await notification.save();

      // Add the notification to the user's notifications array
      user.notifications.push(notification);

      // Save the updated user with the new notification
      await user.save();

      console.log(
        `Sending referral notification to user with referral code ${referralCode}`
      );
    } else {
      console.log(`User with referral code ${referralCode} not found`);
    }
  } catch (error) {
    console.error("Error sending referral notification:", error.message);
  }
}

module.exports = {
  userCreate,
  userLogin,
  userProfile,
  userLogout,
};
