const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

/**
 * calculateAnalytics
 * Triggered whenever a new attempt is written to /attempts/{attemptId}.
 * Validates all data server-side, grades the test, computes engagement,
 * and persists results to /analytics/{studentId}/{testId}.
 */
exports.calculateAnalytics = functions.database
  .ref("/attempts/{attemptId}")
  .onCreate(async (snapshot, context) => {
    const attemptData = snapshot.val();
    const { studentId, testId, answers, startedAt } = attemptData;

    // --- 1. Server-side validation: reject malformed payloads ---
    if (!studentId || typeof studentId !== "string") {
      console.error("Attempt rejected: missing or invalid studentId.");
      return null;
    }
    if (!testId || typeof testId !== "string") {
      console.error("Attempt rejected: missing or invalid testId.");
      return null;
    }
    if (!answers || typeof answers !== "object") {
      console.error(`Attempt rejected: missing answers for ${context.params.attemptId}`);
      return null;
    }

    // --- 2. Verify the test exists and is published ---
    const testSnap = await db.ref(`/tests/${testId}`).once("value");
    if (!testSnap.exists()) {
      console.error(`Test ${testId} not found. Aborting analytics.`);
      return null;
    }
    const testData = testSnap.val();
    if (!testData.isPublished) {
      console.warn(`Test ${testId} is not published. Aborting analytics.`);
      return null;
    }

    // --- 3. Optional assignedTo check (Relaxed for testing so students can submit freely) ---
    if (!testData.assignedTo || !testData.assignedTo[studentId]) {
      console.log(`Note: Student ${studentId} wasn't explicitly assigned to ${testId}, grading anyway.`);
    }

    // --- 4. Fetch questions ---
    const questionsSnap = await db.ref(`/questions/${testId}`).once("value");
    if (!questionsSnap.exists()) {
      console.warn(`Questions not found for testId: ${testId}`);
      return null;
    }

    const questionsMap = questionsSnap.val();

    // --- 5. Grade: score, accuracy, concept-wise breakdown ---
    let correctCount = 0;
    let totalQuestions = 0;
    let expectedTotalSeconds = 0;
    const conceptStats = {};

    for (const [qId, q] of Object.entries(questionsMap)) {
      totalQuestions++;
      expectedTotalSeconds += Number(q.timePerQuestion) || 60;

      const concept = q.conceptTag || "General";
      if (!conceptStats[concept]) {
        conceptStats[concept] = { total: 0, correct: 0 };
      }
      conceptStats[concept].total += 1;

      // Server-side answer validation: answer must be A/B/C/D
      const studentAnswer = answers[qId];
      const validOptions = ["A", "B", "C", "D"];
      if (
        studentAnswer &&
        validOptions.includes(String(studentAnswer).toUpperCase()) &&
        String(studentAnswer).toUpperCase() === String(q.correctAnswer).toUpperCase()
      ) {
        correctCount++;
        conceptStats[concept].correct += 1;
      }
    }

    const accuracy = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);

    // --- 6. Concept-wise performance & weak areas ---
    const conceptWisePerformance = {};
    const weakAreas = [];

    for (const [concept, stats] of Object.entries(conceptStats)) {
      const cAcc = Math.round((stats.correct / Math.max(1, stats.total)) * 100);
      conceptWisePerformance[concept] = cAcc;
      if (cAcc < 60) {
        weakAreas.push(concept);
      }
    }

    // --- 7. Engagement score: based on time spent vs expected ---
    let engagementScore = 80; // sensible default
    const submittedAtMs = Date.now();

    if (startedAt) {
      const startMs = typeof startedAt === "number"
        ? startedAt
        : new Date(startedAt).getTime();

      if (!isNaN(startMs) && startMs > 0) {
        const timeTakenSeconds = (submittedAtMs - startMs) / 1000;

        if (timeTakenSeconds > 0 && expectedTotalSeconds > 0) {
          const ratio = timeTakenSeconds / expectedTotalSeconds;

          if (ratio < 0.2) {
            // Extremely rushed — very low engagement
            engagementScore = Math.max(10, Math.round(ratio * 100 * 4));
          } else if (ratio < 0.5) {
            // A bit rushed — moderate engagement
            engagementScore = Math.round(50 + (ratio - 0.2) / 0.3 * 30);
          } else if (ratio <= 1.5) {
            // Healthy pacing — high engagement
            engagementScore = Math.round(80 + (1 - Math.abs(ratio - 1.0)) * 20);
          } else {
            // Over time — slight drop
            engagementScore = Math.max(50, Math.round(100 - (ratio - 1.5) * 25));
          }
        }
      }
    }

    engagementScore = Math.min(100, Math.max(0, Math.round(engagementScore)));
    const understandingScore = accuracy; // semantic alias

    // --- 8. Persist to /analytics/{studentId}/{testId} ---
    const analyticsPayload = {
      score: correctCount,
      totalQuestions,
      accuracy,
      understandingScore,
      engagementScore,
      conceptWisePerformance,
      weakAreas,
      testTitle: testData.title || "Untitled Test",
      subject: testData.subject || "General",
      submittedAt: submittedAtMs,
      gradedBy: "server",
    };

    await db.ref(`/analytics/${studentId}/${testId}`).set(analyticsPayload);

    // Also stamp score back into the attempt for quick reads
    await snapshot.ref.update({
      score: correctCount,
      accuracy,
      engagementScore,
      gradedAt: admin.database.ServerValue.TIMESTAMP,
    });

    console.log(
      `✅ Analytics for student=${studentId} test=${testId}: ` +
      `score=${correctCount}/${totalQuestions}, accuracy=${accuracy}%, engagement=${engagementScore}%`
    );
    return null;
  });
