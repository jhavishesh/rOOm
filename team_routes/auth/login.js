//login page
const express =require("express");
const route =express.Router();
const { notAuthorize } = require("../../security_functions/authenFunc");
const passport = require("passport");
//Login Part
route.get("/", notAuthorize, (req, res) => {
  res.render("auth/login.ejs", { tabName: "Login rOOm" });
});
route.post(
  "/",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);
module.exports = route;
