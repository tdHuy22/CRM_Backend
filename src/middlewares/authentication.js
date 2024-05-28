const admin = require("../config/firebaseAdmin");
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
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

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

    // await admin.firestore().collection("lecturer").doc(userRecord.uid).set({
    //   name,
    //   email,
    //   address,
    //   phoneNumber,
    // });

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
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

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
    const { email, password, role, name, parentID, address, phoneNumber } =
      req.body;
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

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

    // await admin.firestore().collection("student").doc(userRecord.uid).set({
    //   name,
    //   email,
    //   parentID,
    //   address,
    //   phoneNumber,
    // });

    await addStudent(
      userRecord.uid,
      email,
      name,
      parentID,
      address,
      phoneNumber
    );

    // await admin.firestore().collection("parent").doc(parentID).update({
    //   hasChild: true,
    // });

    await updateParentHasChild(parentID);

    res.status(200);
    res.json(userRecord);
  } catch (error) {
    next(error);
  }
};

module.exports = { addLecturerAuth, addParentAuth, addStudentAuth };
