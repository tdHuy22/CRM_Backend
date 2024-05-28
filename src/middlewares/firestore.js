const { db } = require("../config/firebaseAdmin");

const addLecturer = async (uid, email, name, address, phoneNumber) => {
  await db.collection("lecturer").doc(uid).set({
    name,
    email,
    address,
    phoneNumber,
  });
};

const addParent = async (uid, email, name, address, phoneNumber) => {
  await db.collection("parent").doc(uid).set({
    name,
    email,
    address,
    phoneNumber,
    hasChild: false,
  });
};

const addStudent = async (uid, email, name, parentID, address, phoneNumber) => {
  await db.collection("student").doc(uid).set({
    name,
    email,
    parentID,
    address,
    phoneNumber,
  });
};

const updateParentHasChild = async (parentID) => {
  await db.collection("parent").doc().update({
    hasChild: true,
  });
};

const addAuthentication = async (uid, email, password, role) => {
  await admin.firestore().collection("authentication").doc(uid).set({
    email,
    password,
    role,
  });
};

const getDeviceID = async () => {
  const snapShot = await db.collection("device").get();
  let list = [];
  snapShot.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() });
  });
  return list;
};

const getCourseIDroomID = async (roomID) => {
  const snapShot = await db
    .collection("course")
    .where("roomID", "==", roomID)
    .get();
  let list = [];
  snapShot.forEach((doc) => {
    list.push(doc.id);
  });
  return list;
};

const getScheduleCourseID = async (courseID, date) => {
  const snapShot = await db
    .collection("schedule")
    .where("courseID", "==", courseID)
    .where("date", "==", date)
    .get();

  let list = [];

  snapShot.forEach((doc) => {
    list.push({
      id: doc.id,
      startTime: doc.data().startTime,
      endTime: doc.data().endTime,
    });
  });

  return list;
};

const getStudentCourseID = async (courseID) => {
  const snapShot = await db
    .collection("courseStudent")
    .where("courseID", "==", courseID)
    .get();

  let list = [];

  snapShot.docs.forEach((doc) => {
    list.push(doc.data().studentID);
  });

  return list;
};

const updateAttendanceTrue = async (studentID, scheduleID) => {
  const docRef = db
    .collection("attendance")
    .where("studentID", "==", studentID)
    .where("scheduleID", "==", scheduleID);
  docRef.get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      doc.ref.update({ attended: true });
    });
  });
};

const updateDeviceStatus = async (deviceID, status) => {
  await db.collection("device").doc(deviceID).update({
    status: status,
  });
};

const resetDeviceStatus = async (req, res, next) => {
  try {
    const snapShot = await db.collection("device").get();
    snapShot.forEach((doc) => {
      doc.ref.update({
        status: "Unknown",
      });
    });
    res.status(200);
    res.send("Reset device status successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addAuthentication,
  addLecturer,
  addParent,
  addStudent,
  updateParentHasChild,
  getDeviceID,
  getCourseIDroomID,
  getScheduleCourseID,
  getStudentCourseID,
  updateAttendanceTrue,
  updateDeviceStatus,
  resetDeviceStatus,
};
