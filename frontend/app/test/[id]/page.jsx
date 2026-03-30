'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, set, get, push, onDisconnect, serverTimestamp, remove } from 'firebase/database';
import { auth, db } from '../../../lib/firebase';
import toast from 'react-hot-toast';

export default function TestTakingInterface() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id;

  const [user, setUser] = useState(null);
  const [testData, setTestData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: 'A' }
  const [currentIdx, setCurrentIdx] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  
  const triggerToast = (msg) => {
    toast(msg);
  };

  // 1. Auth & Data Fetching
  useEffect(() => {
    const fetchTest = async (currentUser) => {
      try {
        const testSnap = await get(ref(db, `tests/${testId}`));
        
        if (!testSnap.exists()) {
          triggerToast('Test not found.');
          router.push('/test');
          return;
        }
        
        const data = testSnap.val();
        
        // Security checks
        if (!data.isPublished) {
          triggerToast('This test is not published.');
          router.push('/test');
          return;
        }
        // Security: only assigned students can take this test
        if (!data.assignedTo || data.assignedTo[currentUser.uid] !== true) {
          triggerToast('You are not assigned to this test.');
          setTimeout(() => router.push('/test'), 1200);
          return;
        }

        // ── Duplicate-attempt guard ──
        // Read the scoped per-student index (fast, O(1) lookup).
        const existingAttemptSnap = await get(ref(db, `studentAttempts/${currentUser.uid}/${testId}`));
        if (existingAttemptSnap.exists() && existingAttemptSnap.val().status === 'completed') {
          triggerToast('You have already submitted this test. Viewing your results...');
          setTimeout(() => router.replace(`/test/${testId}/results`), 1200);
          return;
        }

        setTestData(data);
        setTimeLeft(data.timeLimit * 60); // Convert mins to seconds
        setStartedAt(Date.now()); // Store as ms number (required for engagement calc)

        const qSnap = await get(ref(db, `questions/${testId}`));
        
        const qList = [];
        if (qSnap.exists()) {
           qSnap.forEach(child => { 
             qList.push({ questionId: child.key, ...child.val() }); 
           });
        }
        setQuestions(qList);
        
        setIsLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        triggerToast('Failed to load test.');
        router.push('/test');
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchTest(currentUser);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [testId, router]);

  // 2. Timer Hook
  useEffect(() => {
    if (isLoading || isSubmitting || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isSubmitting, timeLeft]);

  // 3. RTDB Telemetry Connection
  useEffect(() => {
    if (!user || !testId || isLoading) return;
    const sessionRef = ref(db, `live_sessions/${testId}/${user.uid}`);
    
    // Automatically wipe node if student loses connection or closes page
    onDisconnect(sessionRef).remove();

    return () => {
      remove(sessionRef);
      onDisconnect(sessionRef).cancel();
    };
  }, [user, testId, isLoading]);

  // 4. RTDB Telemetry Pulse
  useEffect(() => {
    if (!user || !testId || isLoading) return;
    const sessionRef = ref(db, `live_sessions/${testId}/${user.uid}`);
    
    set(sessionRef, {
      status: 'in_progress',
      currentQuestionIndex: currentIdx,
      lastActivity: serverTimestamp()
    }).catch(err => console.error("Telemetry failed:", err));
  }, [user, testId, currentIdx, isLoading]);

  // Submit Helper
  const submitToServer = async (finalAnswers) => {
    setIsSubmitting(true);
    try {
      const attemptId = push(ref(db, 'attempts')).key;
      const submittedAt = Date.now();

      // ── Client-side grading (immediate) ─────────────────────────────────────
      // This writes analytics RIGHT NOW so the teacher sees results immediately.
      // The Cloud Function will later overwrite this with the server-authoritative version.
      let correctCount = 0;
      let totalQuestions = 0;
      let expectedTotalSeconds = 0;
      const conceptStats = {};

      for (const q of questions) {
        const qId = q.questionId;
        totalQuestions++;
        expectedTotalSeconds += Number(q.timePerQuestion) || 60;

        const concept = q.conceptTag || 'General';
        if (!conceptStats[concept]) conceptStats[concept] = { total: 0, correct: 0 };
        conceptStats[concept].total += 1;

        const studentAns = (finalAnswers[qId] || '').toUpperCase();
        const correctAns = (q.correctAnswer || '').toUpperCase();
        if (studentAns && studentAns === correctAns) {
          correctCount++;
          conceptStats[concept].correct += 1;
        }
      }

      const accuracy = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);
      const understandingScore = accuracy;

      // Concept-wise performance & weak areas
      const conceptWisePerformance = {};
      const weakAreas = [];
      for (const [concept, stats] of Object.entries(conceptStats)) {
        const cAcc = Math.round((stats.correct / Math.max(1, stats.total)) * 100);
        conceptWisePerformance[concept] = cAcc;
        if (cAcc < 60) weakAreas.push(concept);
      }

      // Engagement score from time taken vs expected
      let engagementScore = 80;
      if (startedAt && typeof startedAt === 'number') {
        const timeTakenSeconds = (submittedAt - startedAt) / 1000;
        if (timeTakenSeconds > 0 && expectedTotalSeconds > 0) {
          const ratio = timeTakenSeconds / expectedTotalSeconds;
          if (ratio < 0.2) engagementScore = Math.max(10, Math.round(ratio * 100 * 4));
          else if (ratio < 0.5) engagementScore = Math.round(50 + (ratio - 0.2) / 0.3 * 30);
          else if (ratio <= 1.5) engagementScore = Math.round(80 + (1 - Math.abs(ratio - 1.0)) * 20);
          else engagementScore = Math.max(50, Math.round(100 - (ratio - 1.5) * 25));
        }
      }
      engagementScore = Math.min(100, Math.max(0, Math.round(engagementScore)));

      const analyticsPayload = {
        score: correctCount,
        totalQuestions,
        accuracy,
        understandingScore,
        engagementScore,
        conceptWisePerformance,
        weakAreas,
        testTitle: testData?.title || 'Untitled Test',
        subject: testData?.subject || 'General',
        submittedAt,
        gradedBy: 'client', // will be overwritten by cloud function with 'server'
      };

      // Write analytics immediately (teacher sees results right away)
      await set(ref(db, `analytics/${user.uid}/${testId}`), analyticsPayload);

      // Full attempt record — also triggers the Cloud Function for server re-grading.
      await set(ref(db, `attempts/${attemptId}`), {
        testId,
        studentId: user.uid,
        answers: finalAnswers,
        startedAt,
        submittedAt,
        status: 'completed',
      });

      // Lean per-student index — used by test list for O(1) status lookups.
      await set(ref(db, `studentAttempts/${user.uid}/${testId}`), {
        attemptId,
        status: 'completed',
        submittedAt,
      });

      triggerToast('Test submitted successfully! 🎉');
      setTimeout(() => router.push('/test'), 2000);
    } catch (err) {
      console.error('Submit error:', err);
      triggerToast('Failed to submit test. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = useCallback(() => {
    triggerToast('Time is up! Auto-submitting...');
    submitToServer(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  const handleManualSubmit = () => {
    const unansweredCount = questions.length - Object.keys(answers).length;
    let msg = "Are you sure you want to submit?";
    if (unansweredCount > 0) {
      msg = `You have ${unansweredCount} unanswered questions. ${msg}`;
    }
    if (window.confirm(msg)) {
      submitToServer(answers);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body animate-pulse">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-spin">
            <span className="material-symbols-outlined text-primary text-3xl">hourglass_empty</span>
          </div>
          <p className="font-bold text-on-surface-variant">Loading cognitive sanctuary...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const progressPercent = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen relative flex flex-col">


      {/* Top Bar Navigation */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40 border-b border-outline-variant/20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.confirm('Are you sure you want to exit? Your progress may be lost.') && router.push('/test')}
            className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div>
            <h1 className="font-headline font-black text-on-surface text-lg leading-tight">{testData?.title}</h1>
            <p className="text-xs text-on-surface-variant font-bold">{testData?.subject}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-inner ${timeLeft < 300 ? 'bg-error/10 text-error' : 'bg-surface-container text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-[20px]">{timeLeft < 300 ? 'timer_off' : 'timer'}</span>
            <span className="tabular-nums tracking-widest">{formatTime(timeLeft)}</span>
          </div>
          <button 
            onClick={handleManualSubmit}
            disabled={isSubmitting}
            className={`font-bold px-6 py-2 rounded-full text-sm shadow-md transition-all ${isSubmitting ? 'bg-outline text-white opacity-70 cursor-not-allowed' : 'bg-primary text-white hover:bg-opacity-90 active:scale-[0.98]'}`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-10 lg:gap-16 items-start">
        
        {/* Left: Question Number Progress */}
        <aside className="w-full md:w-16 flex-shrink-0 flex md:flex-col gap-2 md:gap-4 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
          {questions.map((q, idx) => {
            const isAnswered = !!answers[q.questionId];
            const isActive = currentIdx === idx;
            return (
              <button
                key={q.questionId}
                onClick={() => setCurrentIdx(idx)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all focus:outline-none flex-shrink-0 ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' 
                    : isAnswered 
                      ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20' 
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </aside>

        {/* Right: Question Body */}
        {currentQ && (
          <div className="flex-1 w-full flex flex-col min-h-[500px] animate-fade-in relative max-w-3xl border border-outline-variant/10 bg-white rounded-3xl p-8 lg:p-12 shadow-ambient">
            {/* Progress Bar Top */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-surface-container-low rounded-t-3xl overflow-hidden">
               <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="flex justify-between items-start mb-10 mt-2">
              <span className="text-xs font-bold px-3 py-1 bg-surface-container rounded-full text-on-surface-variant uppercase tracking-wider">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-xs font-bold text-outline uppercase tracking-widest">{currentQ.difficulty || 'Medium'}</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface leading-snug mb-12 font-headline">
              {currentQ.questionText}
            </h2>

            <div className="space-y-4 flex-1">
              {['A', 'B', 'C', 'D'].map((opt) => {
                const optText = currentQ.options[opt];
                if (!optText) return null;
                const isSelected = answers[currentQ.questionId] === opt;
                
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ.questionId]: opt }))}
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 group focus:outline-none ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full border-2 flex flex-shrink-0 items-center justify-center font-bold text-sm transition-colors ${
                      isSelected ? 'border-primary bg-primary text-white' : 'border-outline-variant text-outline group-hover:border-primary/50'
                    }`}>
                      {opt}
                    </div>
                    <span className={`text-base font-semibold ${isSelected ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                      {optText}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-12 pt-8 border-t border-outline-variant/20">
              <button
                onClick={() => setCurrentIdx(prev => prev - 1)}
                disabled={currentIdx === 0}
                className={`flex items-center gap-2 font-bold px-6 py-3 rounded-full transition-all ${currentIdx === 0 ? 'text-outline pointer-events-none' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                Previous
              </button>
              
              {!isLastQuestion ? (
                <button
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="flex items-center gap-2 font-bold px-8 py-3 rounded-full bg-surface-container-highest text-on-surface hover:bg-secondary-container hover:text-on-secondary-container transition-all active:scale-[0.98]"
                >
                  Next
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              ) : (
                <button
                  onClick={handleManualSubmit}
                  className="flex items-center gap-2 font-bold px-8 py-3 rounded-full bg-gradient-to-tr from-primary to-secondary text-white hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98]"
                >
                  Confirm & Submit
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Decorative gradient background across the whole screen */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/30 via-surface to-purple-50/30" />
    </div>
  );
}
