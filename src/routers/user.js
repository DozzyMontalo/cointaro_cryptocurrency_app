const express = require("express");
const { auth } = require("../middleware/auth");
const router = new express.Router();
const {
  userCreate,
  userLogin,
  userProfile,
  userLogout,
} = require("../controllers/userController");

router.post("/users", userCreate);

router.post("/users/login", userLogin);

router.get("/users/me", auth, userProfile);

router.post("/users/logout", auth, userLogout);

module.exports = router;
