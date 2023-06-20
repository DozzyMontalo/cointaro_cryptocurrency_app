const jwt = require("jsonwebtoken");
const User = require("../model/user");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

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

// Middleware for API authentication
const apiAuth = (req, res, next) => {
  const { api_key, api_secret } = req.body;

  // Check if the provided API key and secret match the expected values
  if (api_key === apiKey && api_secret === apiSecret) {
    next(); // Proceed to the next middleware or route
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.roles === "admin") {
    next();
  } else {
    res.status(403).send("Access denied.");
  }
};

module.exports = { auth, isAdmin, apiAuth };
