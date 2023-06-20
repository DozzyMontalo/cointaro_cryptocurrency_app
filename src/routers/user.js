const express = require("express");
const { auth } = require("../middleware/auth");
const router = new express.Router();
const {
  userCreateGet,
  userCreate,
  userLoginGet,
  userLogin,
  userProfile,
  userLogout,
} = require("../controllers/userController");

router.get("/users", userCreateGet);

router.post("/users", userCreate);

router.get("/users/login", userLoginGet);

router.post("/users/login", userLogin);

router.get("/users/me", auth, userProfile);

router.post("/users/logout", auth, userLogout);

module.exports = router;
