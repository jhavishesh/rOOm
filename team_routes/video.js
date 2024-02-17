const express = require("express");
const route = express.Router();
const { authorize } = require("../security_functions/authenFunc");
const rOOm = require("../data_schema/rOOms");
//Video Display
route.get("/:rOOm", authorize, async (req, res) => {
  const rOOmData = await rOOm.findOne({ rOOmId: req.params.rOOm }).exec();
  res.render("rOOm", {
    tabName: "Microsft Teams",
    count: rOOmData ? rOOmData.count : 0,
    layout: "layouts/videoLayout",
    rOOmId: req.params.rOOm,
    screen: req.query.screen,
    user: req.user,
  });
});

module.exports = route;