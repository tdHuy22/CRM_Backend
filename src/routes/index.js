const router = require("express").Router();
const {
  addLecturerAuth,
  addParentAuth,
  addStudentAuth,
} = require("../middlewares/authentication");
const { resetDeviceStatus } = require("../middlewares/firestore");
const {
  checkStatus,
  postDateOfDate,
  getDataOfDate,
} = require("../middlewares/mqttServer");

router.get("/", function (req, res, next) {
  res.send("Welcome to the API");
});

router.post("/addLecturer", addLecturerAuth);

router.post("/addParent", addParentAuth);

router.post("/addStudent", addStudentAuth);

router.post("/checkStatus", checkStatus);

router.post("/resetDeviceStatus", resetDeviceStatus);

router.post("/postDataOfDate", postDateOfDate);

router.post("/getDataOfDate", getDataOfDate);

module.exports = router;
