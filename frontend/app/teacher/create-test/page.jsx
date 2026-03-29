'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ref, push, set, update, get, onValue, query as dbQuery, orderByChild, equalTo } from 'firebase/database';
import { db, auth } from '../../../lib/firebase';
import ToggleSwitch from '../../components/ToggleSwitch';

const SUBJECTS = ['Mathematics', 'Physics', 'Computer Science', 'Economics', 'History', 'Chemistry'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const AI_STATS = [
  ['High', 'Engagement'],
  ['Med', 'Complexity'],
  ['18m', 'Est. Time'],
];

export default function CreateTest() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit'); // present when editing an existing test

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [timeLimit, setTimeLimit] = useState(60);
  
  // Dynamic Questions State
  const defaultQuestion = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
    questionText: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: 'A',
    conceptTag: 'General',
    difficulty: 'Medium',
    timePerQuestion: 60
  };
  const [questions, setQuestions] = useState([{...defaultQuestion}]);
  
  // Test Publishing Ecosystem State
  const [testId, setTestId] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(!!editId);

  // Student Assignment State
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [showStudentPanel, setShowStudentPanel] = useState(false);
  
  // UI States
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [liveProcturing, setLiveProcturing] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // ── Fetch all students for assignment panel ─────────────────────────────────
  useEffect(() => {
    const studentsQuery = dbQuery(ref(db, 'users'), orderByChild('role'), equalTo('student'));
    const unsub = onValue(studentsQuery, (snap) => {
      const list = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ uid: child.key, ...child.val() });
        });
      }
      setAvailableStudents(list);
    });
    return () => unsub();
  }, []);

  // ── Load existing test when editing ──────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;

    const loadTest = async () => {
      try {
        const [testSnap, qSnap] = await Promise.all([
          get(ref(db, `tests/${editId}`)),
          get(ref(db, `questions/${editId}`)),
        ]);

        if (!testSnap.exists()) {
          triggerToast('Test not found.');
          setIsLoadingEdit(false);
          return;
        }

        const data = testSnap.val();
        setTestId(editId);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setSubject(data.subject || SUBJECTS[0]);
        setTimeLimit(data.timeLimit || 60);
        setIsPublished(data.isPublished === true);

        // Restore previously assigned students
        if (data.assignedTo && typeof data.assignedTo === 'object') {
          setSelectedStudents(new Set(Object.keys(data.assignedTo)));
        }

        if (qSnap.exists()) {
          const loadedQs = [];
          qSnap.forEach((child) => {
            const q = child.val();
            loadedQs.push({
              id: child.key,
              questionText: q.questionText || '',
              options: q.options || { A: '', B: '', C: '', D: '' },
              correctAnswer: q.correctAnswer || 'A',
              conceptTag: q.conceptTag || 'General',
              difficulty: q.difficulty || 'Medium',
              timePerQuestion: q.timePerQuestion || 60,
            });
          });
          if (loadedQs.length > 0) setQuestions(loadedQs);
        }
      } catch (err) {
        console.error('Load test error:', err);
        triggerToast('Failed to load test for editing.');
      } finally {
        setIsLoadingEdit(false);
      }
    };

    loadTest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Helper Methods
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // ── Student selection helpers ─────────────────────────────────────────────
  const toggleStudent = (uid) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === availableStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(availableStudents.map((s) => s.uid)));
    }
  };

  // Build assignedTo map from Set
  const buildAssignedToMap = () => {
    const map = {};
    selectedStudents.forEach((id) => { map[id] = true; });
    return map;
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { ...defaultQuestion, id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7) }]);
  };

  const handleDeleteQuestion = (index) => {
    if (questions.length === 1) {
      triggerToast("You must have at least one question!");
      return;
    }
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (index, optKey, value) => {
    const updated = [...questions];
    updated[index].options = { ...updated[index].options, [optKey]: value };
    setQuestions(updated);
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      triggerToast("Please enter a test title!");
      return;
    }
    if (selectedStudents.size === 0) {
      triggerToast("Please assign at least one student!");
      setShowStudentPanel(true);
      return;
    }
    
    // Validate empty questions
    for (const [i, q] of questions.entries()) {
      if (!q.questionText.trim()) {
         triggerToast(`Question ${i+1} is missing text!`);
         return;
      }
      if (!Object.values(q.options).every(val => val.trim() !== '')) {
         triggerToast(`Question ${i+1} has empty options!`);
         return;
      }
    }

    setIsSaving(true);
    try {
      let currentTestId = testId;
      if (!currentTestId) {
        currentTestId = push(ref(db, 'tests')).key;
        setTestId(currentTestId);
      }

      const testUpdates = {
        title,
        description,
        subject,
        timeLimit: parseInt(timeLimit) || 60,
        totalQuestions: questions.length,
        createdBy: auth.currentUser?.uid || 'mock-teacher',
        assignedTo: buildAssignedToMap(),
        ...(testId ? {} : { isPublished: false }),
      };

      const questionsPayload = {};
      questions.forEach((q, idx) => {
        questionsPayload[`q${idx}`] = {
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          conceptTag: q.conceptTag,
          difficulty: q.difficulty,
          timePerQuestion: q.timePerQuestion,
        };
      });

      await update(ref(db, `tests/${currentTestId}`), testUpdates);
      await set(ref(db, `questions/${currentTestId}`), questionsPayload);

      triggerToast(`Draft saved — ${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''} assigned 💾`);
    } catch (err) {
      console.error('Save Draft Error:', err);
      triggerToast(`Failed to save draft: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!testId) {
      triggerToast('Please save draft first before publishing!');
      return;
    }
    if (selectedStudents.size === 0) {
      triggerToast('Please assign at least one student before publishing!');
      setShowStudentPanel(true);
      return;
    }

    const confirmAction = window.confirm(
      `Publish this test to ${selectedStudents.size} assigned student${selectedStudents.size !== 1 ? 's' : ''}? They will see it instantly.`
    );
    if (!confirmAction) return;

    setIsPublishing(true);
    try {
      // Persist both the assignedTo map AND flip isPublished in one atomic update
      await update(ref(db, `tests/${testId}`), {
        isPublished: true,
        assignedTo: buildAssignedToMap(),
      });

      setIsPublished(true);
      triggerToast(`Published to ${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''} ✅`);
    } catch (err) {
      console.error('Publish Error:', err);
      triggerToast('Failed to publish test.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Show a full-screen loader while pre-populating edit fields
  if (isLoadingEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-spin">
            <span className="material-symbols-outlined text-primary text-2xl">hourglass_empty</span>
          </div>
          <p className="font-bold text-on-surface-variant">Loading test for editing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-body bg-background text-on-surface min-h-screen pb-32">
      
      {/* Dynamic Toast Element */}
      <div 
        className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-surface-container-highest border border-outline-variant/30 shadow-2xl rounded-xl px-6 py-3.5 flex items-center gap-3 transition-all duration-300 ${
          showToast ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
        }`}
      >
        <span className="font-extrabold text-sm text-on-surface tracking-wide">{toastMessage}</span>
      </div>

      {/* Top App Bar */}
      <header className="bg-white/80 backdrop-blur-xl top-0 z-40 shadow-sm flex justify-between items-center w-full px-6 py-4 sticky">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <Link
            href="/teacher"
            aria-label="Back to dashboard"
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all duration-200 active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>

          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-lg" aria-hidden="true">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div>
            <h1 className="font-headline font-black text-primary text-xl leading-tight">{editId ? 'Edit Test' : 'Create Smart Test'}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                isPublished ? 'bg-green-100 text-green-700'
                : editId ? 'bg-blue-100 text-blue-700'
                : testId ? 'bg-yellow-100 text-yellow-700'
                : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {isPublished ? 'Published' : editId ? 'Editing' : testId ? 'Draft Saved' : 'Unsaved Draft'}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex gap-6" aria-label="Test builder navigation">
            <button type="button" className="text-primary font-bold text-sm" aria-current="page">Builder</button>
            <button type="button" className="text-on-surface-variant text-sm hover:bg-surface-container-low transition-all px-3 py-1 rounded-full">Settings</button>
            <button type="button" className="text-on-surface-variant text-sm hover:bg-surface-container-low transition-all px-3 py-1 rounded-full">Analytics</button>
          </nav>
          <div className="h-6 w-[1px] bg-outline-variant" aria-hidden="true" />
          <button type="button" className="bg-surface-container-low text-primary font-bold px-4 py-2 rounded-full text-sm hover:bg-primary-fixed/50 transition-colors">
            Preview
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface">Teacher Profile</p>
            <p className="text-[10px] text-on-surface-variant">Mathematics Dept.</p>
          </div>
          <Image
            src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&q=80"
            alt="Teacher profile"
            width={40}
            height={40}
            className="rounded-full object-cover ring-2 ring-primary/10"
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto pt-10 px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Test Builder */}
        <div className="lg:col-span-8 space-y-8">
          {/* Hero Header */}
          <section className="space-y-2">
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Create Smart Test</h2>
            <p className="text-on-surface-variant text-lg">Design concept-based assessments with real-time analytics.</p>
          </section>

          {/* Test Details Card */}
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="test-title" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Test Title</label>
                <input
                  id="test-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-primary/20 text-on-surface font-medium placeholder:text-outline outline-none"
                  placeholder="e.g., Advanced Algebra & Functions"
                  type="text"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="test-description" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Description</label>
                <textarea
                  id="test-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline outline-none resize-none"
                  placeholder="Describe the learning objectives of this test..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject-category" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Subject Category</label>
                <select
                  id="subject-category"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl py-4 px-6 focus:ring-2 focus:ring-primary/20 text-on-surface outline-none appearance-none"
                >
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl self-end h-[60px]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary fill-icon" aria-hidden="true">sensors</span>
                  <span className="font-bold text-sm text-primary">Live Proctoring</span>
                </div>
                <ToggleSwitch
                  id="live-proctoring"
                  checked={liveProcturing}
                  onChange={() => setLiveProcturing((v) => !v)}
                  size="md"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Question Builder UI */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold flex items-center gap-2 font-headline">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-black" aria-hidden="true">{questions.length}</span>
                Question Builder
              </h3>
              <span className="text-xs font-bold text-on-surface-variant">{timeLimit} MIN TOTAL ESTIMATED</span>
            </div>

            {questions.map((q, index) => (
              <div key={q.id} className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border-l-4 border-primary hover:shadow-ambient transition-all relative">
                {/* Delete Button (floating) */}
                <button 
                  type="button" 
                  onClick={() => handleDeleteQuestion(index)}
                  className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors flex items-center justify-center"
                  aria-label="Delete question"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">delete</span>
                </button>

                <div className="flex flex-col gap-6">
                  {/* Metadata Editor: Concept & Difficulty */}
                  <div className="flex gap-4 items-center">
                    <span className="text-xs font-bold text-outline uppercase">Q{index + 1}.</span>
                    <input 
                      type="text"
                      className="text-xs bg-surface-container-low border-none rounded-full py-1.5 px-4 focus:ring-2 focus:ring-primary/20 text-on-surface outline-none w-32 font-bold"
                      placeholder="Concept Tag"
                      value={q.conceptTag}
                      onChange={(e) => handleQuestionChange(index, 'conceptTag', e.target.value)}
                    />
                    <select 
                      className="text-xs bg-surface-container-low border-none rounded-full py-1.5 px-3 focus:ring-2 focus:ring-primary/20 text-on-surface outline-none font-bold"
                      value={q.difficulty}
                      onChange={(e) => handleQuestionChange(index, 'difficulty', e.target.value)}
                    >
                      {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* Question Text */}
                  <div className="w-full">
                    <label htmlFor={`question-text-${index}`} className="sr-only">Question text</label>
                    <textarea
                      id={`question-text-${index}`}
                      value={q.questionText}
                      onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-xl font-semibold placeholder:text-outline-variant resize-none outline-none"
                      placeholder="Type your question here..."
                      rows={2}
                    />
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="group" aria-label="Answer options">
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <div key={opt} className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                          <input
                            className="w-5 h-5 text-primary border-outline-variant focus:ring-primary/20 cursor-pointer"
                            name={`correct-answer-${index}`}
                            type="radio"
                            id={`option-${index}-${opt}`}
                            checked={q.correctAnswer === opt}
                            onChange={() => handleQuestionChange(index, 'correctAnswer', opt)}
                            aria-label={`Mark option ${opt} as correct`}
                          />
                        </div>
                        <label htmlFor={`option-${index}-${opt}`} className="sr-only">Option {opt}</label>
                        <input
                          className={`w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-16 focus:ring-2 focus:ring-primary/20 text-on-surface outline-none transition-all ${q.correctAnswer === opt ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}
                          type="text"
                          placeholder={`Option ${opt}`}
                          value={q.options[opt]}
                          onChange={(e) => handleOptionChange(index, opt, e.target.value)}
                          aria-label={`Answer option ${opt}`}
                        />
                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase ${q.correctAnswer === opt ? 'text-primary' : 'text-outline'}`} aria-hidden="true">
                          {q.correctAnswer === opt ? 'Correct' : `Option ${opt}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-8 border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-all group active:scale-[0.99]"
            >
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                <span className="material-symbols-outlined" aria-hidden="true">add</span>
              </div>
              <span className="font-bold text-sm tracking-wide">ADD NEW QUESTION</span>
            </button>
          </div>
        </div>

        {/* Right Column: Settings & AI */}
        <aside className="lg:col-span-4 space-y-8" aria-label="Test settings and AI insights">
          <div className="bg-surface-container-low rounded-xl p-8 space-y-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" aria-hidden="true">settings</span>
              <h2 className="font-bold text-lg font-headline">Test Settings</h2>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="time-range" className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Total Time Limit</label>
                <div className="flex items-center gap-3">
                  <input 
                    id="time-range" 
                    className="w-full h-2 bg-outline-variant/30 rounded-lg appearance-none cursor-pointer accent-primary" 
                    type="range" 
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    min="5" 
                    max="180" 
                  />
                  <span className="text-sm font-bold w-12 text-on-surface">{timeLimit}m</span>
                </div>
              </div>

              <div className="border-b border-outline-variant/20 pb-3">
                <ToggleSwitch
                  id="shuffle-questions"
                  label="Shuffle Questions"
                  checked={shuffleQuestions}
                  onChange={() => setShuffleQuestions((v) => !v)}
                  size="sm"
                />
              </div>
              <div className="border-b border-outline-variant/20 pb-3">
                <ToggleSwitch
                  id="auto-submit"
                  label="Auto-submit on Exit"
                  checked={autoSubmit}
                  onChange={() => setAutoSubmit((v) => !v)}
                  size="sm"
                />
              </div>
            </div>
          </div>

          <section aria-label="AI insights" className="bg-secondary-container rounded-xl p-8 text-white space-y-6 relative overflow-hidden shadow-xl shadow-primary/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" aria-hidden="true" />
            <div className="relative z-10 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <span className="material-symbols-outlined fill-icon" aria-hidden="true">auto_awesome</span>
                AI Insights
              </h2>
              <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full font-bold uppercase">Predictive</span>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">78%</span>
                <span className="text-sm opacity-80 mb-1">Expected Avg.</span>
              </div>
              <p className="text-sm opacity-90 leading-relaxed">
                Based on history, 4 option questions take exactly {timeLimit / Math.max(1, questions.length)}m each!
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {AI_STATS.map(([v, l]) => (
                  <div key={l} className="bg-white/10 h-16 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-xs font-bold">{v}</span>
                    <span className="text-[10px] opacity-60">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Student Assignment Panel ───────────────────────────────── */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
            {/* Header row — always visible */}
            <button
              type="button"
              onClick={() => setShowStudentPanel((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">group_add</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-on-surface">Assign Students</p>
                  <p className="text-[10px] text-on-surface-variant">
                    {selectedStudents.size === 0
                      ? 'No students selected'
                      : `${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''} assigned`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedStudents.size > 0 && (
                  <span className="text-[10px] font-black bg-primary text-white px-2.5 py-1 rounded-full">
                    {selectedStudents.size}
                  </span>
                )}
                <span className={`material-symbols-outlined text-on-surface-variant text-sm transition-transform duration-200 ${showStudentPanel ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
            </button>

            {/* Collapsible body */}
            {showStudentPanel && (
              <div className="border-t border-outline-variant/10">
                {availableStudents.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 block mb-2">person_off</span>
                    <p className="text-xs text-on-surface-variant font-medium">No registered students yet.</p>
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Students must register to appear here.</p>
                  </div>
                ) : (
                  <>
                    {/* Select All bar */}
                    <div className="px-5 py-3 bg-surface-container-low/60 flex items-center justify-between border-b border-outline-variant/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        {availableStudents.length} student{availableStudents.length !== 1 ? 's' : ''} available
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[11px] font-bold text-primary hover:underline"
                      >
                        {selectedStudents.size === availableStudents.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {/* Student list */}
                    <ul className="max-h-56 overflow-y-auto divide-y divide-outline-variant/5" role="group" aria-label="Student selection">
                      {availableStudents.map((student) => {
                        const isSelected = selectedStudents.has(student.uid);
                        return (
                          <li key={student.uid}>
                            <label
                              htmlFor={`student-${student.uid}`}
                              className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary/5' : 'hover:bg-surface-container-low'
                              }`}
                            >
                              <input
                                id={`student-${student.uid}`}
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudent(student.uid)}
                                className="w-4 h-4 rounded text-primary border-outline-variant focus:ring-primary/20 accent-primary cursor-pointer flex-shrink-0"
                              />
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                isSelected ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                              }`}>
                                {(student.name || student.email || 'S').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                                  {student.name || 'Unnamed Student'}
                                </p>
                                <p className="text-[10px] text-on-surface-variant truncate">{student.email || student.uid.slice(0, 12)}</p>
                              </div>
                              {isSelected && (
                                <span className="material-symbols-outlined text-primary text-sm flex-shrink-0">check_circle</span>
                              )}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Student View</h3>
              <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" aria-hidden="true" /> LIVE
              </span>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/20" aria-hidden="true">
              <p className="text-xs font-semibold mb-3">{questions[0]?.questionText || 'Preview...'}</p>
              <div className="space-y-2">
                <div className="h-6 bg-white rounded border border-outline-variant/20 overflow-hidden text-[10px] px-2 flex items-center text-outline">
                   {questions[0]?.options?.A || ''}
                </div>
                <div className="h-6 bg-primary/10 rounded border border-primary/30 text-primary text-[10px] px-2 flex items-center overflow-hidden">
                   {questions[0]?.options?.B || ''}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-2xl z-50 px-6 py-4 flex items-center justify-between shadow-[0_-10px_40px_rgba(53,37,205,0.06)] border-t border-outline-variant/20">
        <div className="flex items-center gap-4">
          {/* Save Draft — always enabled; uses update() so it never wipes isPublished or assignedTo */}
          <button 
            onClick={handleSaveDraft}
            disabled={isSaving}
            type="button" 
            className={`flex items-center gap-2 font-bold text-sm transition-colors px-4 py-2 rounded-lg ${isSaving ? 'text-outline-variant cursor-not-allowed' : 'text-on-surface-variant hover:text-primary active:bg-surface-container-low'}`}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              {isSaving ? 'hourglass_empty' : 'save'}
            </span>
            {isSaving ? 'Saving...' : (testId ? 'Update' : 'Save Draft')}
          </button>
          <div className="h-4 w-[1px] bg-outline-variant" aria-hidden="true" />
          <p className="text-xs text-on-surface-variant hidden sm:block">
            {testId ? `ID: ${testId.substring(0,8)}...` : 'Not saved yet'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button type="button" className="hidden sm:flex items-center gap-2 bg-surface-container-low text-on-surface font-bold px-6 py-3 rounded-full text-sm hover:bg-surface-container transition-all active:scale-[0.98]">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">visibility</span>
            Preview Full Test
          </button>
          
          {/* Publish / Re-publish — available even on edit if not currently publishing */}
          <button 
            onClick={handlePublish}
            disabled={isPublishing || !testId}
            type="button" 
            className={`flex items-center gap-2 font-bold px-8 py-3 rounded-full text-sm shadow-lg shadow-primary/20 transition-all ${
              isPublishing || !testId
                ? 'bg-outline text-white opacity-70 cursor-not-allowed'
                : isPublished
                  ? 'bg-gradient-to-tr from-green-500 to-emerald-600 text-white hover:shadow-green-200 active:scale-[0.98]'
                  : 'bg-gradient-to-tr from-primary to-secondary text-white hover:shadow-primary/30 active:scale-[0.98]'
            }`}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              {isPublished ? 'published_with_changes' : (isPublishing ? 'public' : 'rocket_launch')}
            </span>
            {isPublishing ? 'Publishing...' : (isPublished ? 'Re-Publish' : 'Publish Test')}
          </button>
        </div>
      </footer>
    </div>
  );
}
