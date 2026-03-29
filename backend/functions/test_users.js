const admin = require("firebase-admin");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
admin.initializeApp({projectId: "focus-flow-72892"});
const db = admin.firestore();
db.collection("users").get().then(snap => {
  console.log("Found Users:", snap.docs.length);
  console.log(snap.docs.map(d => d.data()));
  process.exit();
}).catch(console.error);
