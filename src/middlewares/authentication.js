const { auth } = require("../config/firebaseAdmin");
const {
  addAuthentication,
  addLecturer,
  addParent,
  addStudent,
  updateParentHasChild,
} = require("../middlewares/firestore");

const addLecturerAuth = async (req, res, next) => {
  try {
    const { email, password, role, name, address, phoneNumber } = req.body;
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role });

    await addAuthentication(userRecord.uid, email, password, role);

    await addLecturer(userRecord.uid, email, name, address, phoneNumber);

    res.status(200);
    res.json(userRecord);
  } catch (error) {
    next(error);
  }
};

const addParentAuth = async (req, res, next) => {
  try {
    const { email, password, role, name, address, phoneNumber } = req.body;
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role });

    // await admin
    //   .firestore()
    //   .collection("authentication")
    //   .doc(userRecord.uid)
    //   .set({
    //     email,
    //     password,
    //     role,
    //   });

    await addAuthentication(userRecord.uid, email, password, role);

    // await admin.firestore().collection("parent").doc(userRecord.uid).set({
    //   name,
    //   email,
    //   address,
    //   phoneNumber,
    //   hasChild: false,
    // });

    await addParent(userRecord.uid, email, name, address, phoneNumber);

    res.status(200);
    res.json(userRecord);
  } catch (error) {
    next(error);
  }
};

const addStudentAuth = async (req, res, next) => {
  try {
    const {
      email,
      password,
      role,
      name,
      parentID,
      address,
      phoneNumber,
      RFID,
    } = req.body;
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role });

    await addAuthentication(userRecord.uid, email, password, role);

    await addStudent(
      userRecord.uid,
      email,
      name,
      parentID,
      address,
      phoneNumber,
      RFID
    );

    await updateParentHasChild(parentID);

    res.status(200);
    res.json(userRecord);
  } catch (error) {
    next(error);
  }
};

const deleteLecturerAuth = async (req, res, next) => {
  try {
    const { id } = req.body;
    await auth.deleteUser(id);
    res.status(200);
    res.json({ message: "Lecturer deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteParentAuth = async (req, res, next) => {
  try {
    const { id } = req.body;
    await auth.deleteUser(id);
    res.status(200);
    res.json({ message: "Parent deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteStudentAuth = async (req, res, next) => {
  try {
    const { id } = req.body;
    await auth.deleteUser(id);
    res.status(200);
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addLecturerAuth,
  addParentAuth,
  addStudentAuth,
  deleteLecturerAuth,
  deleteParentAuth,
  deleteStudentAuth,
};
