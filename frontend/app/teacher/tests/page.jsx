'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, update, remove, get, query, orderByChild, equalTo } from 'firebase/database';
import { auth, db } from '../../../lib/firebase';
import AppHeader from '../../components/AppHeader';
import BottomNav from '../../components/BottomNav';

export default function TeacherTestsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // testId to delete
  const [actionLoading, setActionLoading] = useState(null); // testId being acted on

  // ── Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/'); return; }
      setUser(u);
    });
    return () => unsub();
  }, [router]);

  // ── Listen to /tests, filter by createdBy ──
  useEffect(() => {
    if (!user) return;
    const testsRef = ref(db, 'tests');
    const unsub = onValue(testsRef, (snap) => {
      const result = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const data = child.val();
          if (data.createdBy === user.uid) {
            result.push({ id: child.key, ...data });
          }
        });
      }
      setTests(result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setIsLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ── Filter ──
  const filtered = (tests || []).filter((t) => {
    const matchSearch =
      (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'Published') return t.isPublished;
    if (filter === 'Drafts') return !t.isPublished;
    return true;
  });

  const totalTests = (tests || []).length;
  const publishedCount = (tests || []).filter((t) => t.isPublished).length;
  const draftCount = totalTests - publishedCount;

  const getDifficultyColor = (d) => {
    if (d === 'Easy') return 'bg-green-100 text-green-700';
    if (d === 'Hard') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };

  // ── Toggle Publish ──
  const handleTogglePublish = async (test) => {
    setActionLoading(test.id);
    try {
      const isPublishing = !test.isPublished;
      let assignedToMap = null;

      if (isPublishing) {
        // Query global users to locate students physically logged onto platform
        const usersQuery = query(ref(db, 'users'), orderByChild('role'), equalTo('student'));
        const snapshot = await get(usersQuery);
        const studentIds = [];
        if (snapshot.exists()) {
          snapshot.forEach(childSnap => { studentIds.push(childSnap.key); });
        }

        if (studentIds.length > 0) {
          assignedToMap = {};
          studentIds.forEach(id => {
            assignedToMap[id] = true;
          });
        }
      }

      await update(ref(db, `tests/${test.id}`), { 
        isPublished: isPublishing,
        ...(isPublishing && assignedToMap ? { assignedTo: assignedToMap } : {})
      });
      
    } catch (err) {
      console.error('Publish toggle error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Delete Test ──
  const handleDelete = async (testId) => {
    setActionLoading(testId);
    try {
      await remove(ref(db, `tests/${testId}`));
      await remove(ref(db, `questions/${testId}`));
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-28">
      <AppHeader variant="teacher" />

      <main className="max-w-6xl mx-auto px-6 pt-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/teacher" className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </Link>
              <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight">My Tests</h1>
            </div>
            <p className="text-on-surface-variant ml-9">All tests you've created — drafts and published.</p>
          </div>
          <Link href="/teacher/create-test">
            <button type="button" className="flex items-center gap-2 bg-gradient-to-br from-primary to-secondary text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-all">
              <span className="material-symbols-outlined text-xl">add</span>
              Create New Test
            </button>
          </Link>
        </div>

        {/* Summary */}
        {!isLoading && totalTests > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Total Tests', value: totalTests, icon: 'quiz', color: 'bg-primary/10 text-primary' },
              { label: 'Published', value: publishedCount, icon: 'published_with_changes', color: 'bg-tertiary-fixed/80 text-tertiary' },
              { label: 'Drafts', value: draftCount, icon: 'edit_note', color: 'bg-amber-100 text-amber-700' },
            ].map((s) => (
              <div key={s.label} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                  <span className="material-symbols-outlined text-xl">{s.icon}</span>
                </div>
                <p className="text-2xl font-black text-on-surface">{s.value}</p>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/40 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2">
            {['All', 'Published', 'Drafts'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  filter === f ? 'bg-primary text-white shadow-md' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 hover:border-primary/40'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Test Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-surface-container-lowest rounded-2xl animate-pulse border border-outline-variant/10" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((test) => {
              const questionCount = test.questions
                ? Object.keys(test.questions).length
                : 0;
              const assignedCount = test.assignedTo
                ? Object.keys(test.assignedTo).length
                : 0;

              const isActing = actionLoading === test.id;
              return (
                <div
                  key={test.id}
                  className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10 hover:shadow-md hover:border-primary/20 transition-all group"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          test.isPublished ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {test.isPublished ? '✓ Published' : 'Draft'}
                        </span>
                        {test.subject && (
                          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                            {test.subject}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-on-surface text-lg leading-tight truncate group-hover:text-primary transition-colors">
                        {test.title || 'Untitled Test'}
                      </h3>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Edit */}
                      <Link href={`/teacher/create-test?edit=${test.id}`}>
                        <button type="button" aria-label="Edit test"
                          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </Link>
                      {/* Publish / Unpublish */}
                      <button type="button"
                        onClick={() => handleTogglePublish(test)}
                        disabled={isActing}
                        aria-label={test.isPublished ? 'Unpublish test' : 'Publish test'}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                          test.isPublished
                            ? 'bg-tertiary-fixed/20 text-tertiary hover:bg-error-container hover:text-error'
                            : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                        } ${isActing ? 'opacity-50 pointer-events-none' : ''}`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {test.isPublished ? 'unpublished' : 'publish'}
                        </span>
                      </button>
                      {/* Delete */}
                      <button type="button"
                        onClick={() => setConfirmDelete(test.id)}
                        disabled={isActing}
                        aria-label="Delete test"
                        className={`w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors ${
                          isActing ? 'opacity-50 pointer-events-none' : ''
                        }`}>
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-surface-container rounded-xl p-3">
                      <p className="text-xs text-on-surface-variant">Duration</p>
                      <p className="font-black text-sm text-on-surface">{test.timeLimit ?? '—'}m</p>
                    </div>
                    <div className="bg-surface-container rounded-xl p-3">
                      <p className="text-xs text-on-surface-variant">Questions</p>
                      <p className="font-black text-sm text-on-surface">{questionCount || '—'}</p>
                    </div>
                    <div className="bg-surface-container rounded-xl p-3">
                      <p className="text-xs text-on-surface-variant">Assigned</p>
                      <p className="font-black text-sm text-on-surface">{assignedCount}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : totalTests === 0 ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-7xl text-on-surface-variant/30 block mb-4">quiz</span>
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">No tests yet</h2>
            <p className="text-on-surface-variant text-sm mb-8 max-w-sm mx-auto">
              Create your first test and publish it to start collecting real-time analytics from your students.
            </p>
            <Link href="/teacher/create-test">
              <button type="button" className="bg-gradient-to-br from-primary to-secondary text-white px-8 py-3.5 rounded-full font-bold shadow-lg hover:scale-105 transition-all">
                Create First Test
              </button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl block mb-3 opacity-30">search_off</span>
            <p className="font-medium">No tests match your search.</p>
          </div>
        )}
      </main>

      <BottomNav variant="teacher" />

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-error text-3xl">delete_forever</span>
            </div>
            <h2 className="font-headline text-xl font-black text-on-surface mb-2">Delete this test?</h2>
            <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
              This will permanently remove the test and all its questions. Existing student results will not be affected.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-full border border-outline-variant/40 font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                disabled={actionLoading === confirmDelete}
                className="flex-1 py-3 rounded-full bg-error text-white font-bold text-sm hover:bg-opacity-90 transition-all disabled:opacity-60"
              >
                {actionLoading === confirmDelete ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
