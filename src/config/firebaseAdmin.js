require("dotenv").config();
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./serviceAccountKey.json");

const serviceAccountDev = require("./serviceAccountKeyDev.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountDev),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getFirestore();

module.exports = { admin, db };
