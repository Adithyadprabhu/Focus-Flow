const admin = require("firebase-admin");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8088";
admin.initializeApp({projectId: "focus-flow-72892"});

// Mock context for the callable
const context = {
  auth: { uid: '7Bay7gXKnqhEcilMkduxU7GPfpck' }
};

const data = {
  title: "Test Function",
  subject: "Math",
  description: "",
  timeLimit: 60,
  questions: [
    { questionText: "1+1?", options: {A: "2", B: "3", C: "4", D: "5"}, correctAnswer: "A" }
  ]
};

const { createTest } = require("./index.js");

// createTest is a mapped function wrapper, we can extract the async handler:
// Since firebase-functions v4, we can run it like this:
try {
  const func = createTest.__trigger || createTest.run || createTest;
  console.log("Extracted func:", !!func);
  
  if (typeof func === 'function') {
    func(data, context).then(console.log).catch(err => {
      console.error("Function threw:", err);
    });
  }
} catch(e) { console.error("Script failed", e); }
