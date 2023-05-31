const jwt = require("jsonwebtoken");
const User = require("../model/user");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    })
      .populate("balances")
      .populate("notifications");

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next();
  } catch (e) {
    res.status(401).send({ error: "please authenticate." });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.roles === "admin") {
    next();
  } else {
    res.status(403).send("Access denied.");
  }
};

module.exports = { auth, isAdmin };
