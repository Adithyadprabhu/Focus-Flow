'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { auth, db } from '../../lib/firebase';

export default function MyTestsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState([]);
  const [attemptsMap, setAttemptsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('New test available 🎉');

  // Handle Auth State
  useEffect(() => {
    let connectedRef;
    let userStatusRef;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Setup RTDB Presence Tracking
        connectedRef = ref(db, '.info/connected');
        userStatusRef = ref(db, `status/${currentUser.uid}`);

        onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            onDisconnect(userStatusRef).set({ state: 'offline', last_changed: serverTimestamp() }).then(() => {
              set(userStatusRef, { state: 'online', last_changed: serverTimestamp() });
            });
          }
        });
      } else {
        setIsLoading(false);
        setTests([]);
        if (userStatusRef) {
          set(userStatusRef, { state: 'offline', last_changed: serverTimestamp() });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Attempts via per-student index to determine status
  useEffect(() => {
    if (!user) return;

    // /studentAttempts/{uid} is a flat map: { [testId]: { status, submittedAt, attemptId } }
    // This is secure (only the owning student can read) and O(1) per test lookup.
    const studentAttemptsRef = ref(db, `studentAttempts/${user.uid}`);

    const unsubscribeAttempts = onValue(studentAttemptsRef, (snapshot) => {
      const map = {};
      if (snapshot.exists()) {
        snapshot.forEach(childSnap => {
          const testId = childSnap.key;
          const data = childSnap.val();
          map[testId] = data.status === 'in_progress' ? 'In Progress' : 'Completed';
        });
      }
      setAttemptsMap(map);
    });

    return () => unsubscribeAttempts();
  }, [user]);

  // Fetch Assigned Tests Real-time
  useEffect(() => {
    if (!user) return;

    setTimeout(() => setIsLoading(true), 0);

    const testsRef = ref(db, 'tests');

    let isInitialLoad = true;
    let oldTestCount = 0;

    const unsubscribeTests = onValue(testsRef, (snapshot) => {
      const newTests = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnap) => {
          const data = childSnap.val();
          // Secure client-side JSON filtering parsing Realtime Database nodes precisely
          if (data.isPublished === true && data.assignedTo && data.assignedTo[user.uid] === true) {
            newTests.push({
              id: childSnap.key,
              title: data.title || 'Untitled Test',
              topic: data.subject || data.topic || 'General',
              numQuestions: data.totalQuestions || 0,
              timeLimit: data.timeLimit || 60,
              difficulty: data.difficulty || 'Medium',
              ...data
            });
          }
        });
      }

      if (!isInitialLoad && newTests.length > oldTestCount) {
        setToastMessage(`New test available 🎉: ${newTests[newTests.length - 1]?.title}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5500);
      }

      oldTestCount = newTests.length;
      setTests(newTests);
      
      if (isInitialLoad) {
        // Small delay so skeleton loading looks deliberate
        setTimeout(() => setIsLoading(false), 600);
        isInitialLoad = false;
      }
    });

    return () => unsubscribeTests();
  }, [user]);

  // Merge tests with attempts map to produce finalised viewable array
  const fullTestsData = useMemo(() => {
    return tests.map((test) => ({
      ...test,
      status: attemptsMap[test.id] || 'Not Started'
    }));
  }, [tests, attemptsMap]);

  // Filters setup
  const filteredTests = useMemo(() => {
    return fullTestsData.filter((test) => {
      const matchSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          test.topic.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (filter === 'All') return matchSearch;
      if (filter === 'Pending') return matchSearch && (test.status === 'Not Started' || test.status === 'In Progress');
      if (filter === 'Completed') return matchSearch && test.status === 'Completed';
      return matchSearch;
    });
  }, [fullTestsData, searchQuery, filter]);

  // UI Helpers
  const getDifficultyBadge = (level) => {
    if (level === 'Easy') return 'bg-green-100 text-green-700 border-green-200';
    if (level === 'Medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getStatusBadge = (status) => {
    if (status === 'Not Started') return { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' };
    if (status === 'In Progress') return { dot: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' };
    return { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' };
  };

  const getActionButtonConfig = (status) => {
    if (status === 'Not Started') {
      return { 
        label: 'Start Test', 
        icon: 'play_arrow', 
        classes: 'bg-primary text-white hover:bg-opacity-90 shadow-md shadow-primary/20' 
      };
    }
    if (status === 'In Progress') {
      return { 
        label: 'Resume Test', 
        icon: 'resume', 
        classes: 'bg-secondary text-white hover:bg-opacity-90 shadow-md shadow-secondary/20' 
      };
    }
    return { 
      label: 'View Result', 
      icon: 'analytics', 
      classes: 'bg-surface-container text-on-surface-variant hover:text-primary transition-colors' 
    };
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-24 relative">
      <AppHeader variant="student" />

      {/* Toast Notification */}
      <div 
        className={`fixed top-24 right-4 z-50 bg-white border border-primary/20 shadow-xl rounded-xl px-5 py-4 max-w-sm flex items-start gap-4 transition-all duration-500 transform ${
          showToast ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
          <span className="material-symbols-outlined text-xl">notifications_active</span>
        </div>
        <div>
          <p className="font-bold text-sm text-on-surface mb-0.5">{toastMessage.split(':')[0]}</p>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {toastMessage.split(':')[1] || 'A new assignment has popped up on your dashboard. Refresh to focus in!'}
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-outline-variant/30 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface mb-2 font-headline tracking-tight">
              My Tests
            </h1>
            <p className="text-on-surface-variant text-base">View and attempt your assigned tests</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64 flex-shrink-0">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true">
                search
              </span>
              <input 
                type="text" 
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative w-full sm:w-48 flex-shrink-0">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant/40 rounded-full py-3 pl-5 pr-12 text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium cursor-pointer shadow-sm transition-all"
                aria-label="Filter tests"
              >
                <option value="All">All Tests</option>
                <option value="Pending">Pending (To-Do)</option>
                <option value="Completed">Completed</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" aria-hidden="true">
                expand_more
              </span>
            </div>
          </div>
        </section>

        {/* Content Section */}
        {isLoading ? (
          /* Skeleton Loading UI */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/10 min-h-[250px] flex flex-col justify-between animate-pulse">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 bg-surface-container-highest rounded-full w-20"></div>
                    <div className="h-7 bg-surface-container-highest rounded-full w-28"></div>
                  </div>
                  <div className="h-8 bg-surface-container-highest rounded-lg w-3/4 mb-4"></div>
                  <div className="h-5 bg-surface-container-highest rounded w-1/2 mb-8"></div>
                  <div className="flex gap-4">
                    <div className="h-6 bg-surface-container-highest rounded-xl w-20"></div>
                    <div className="h-6 bg-surface-container-highest rounded-xl w-24"></div>
                  </div>
                </div>
                <div className="h-14 bg-surface-container-highest rounded-xl w-full mt-6"></div>
              </div>
            ))}
          </div>
        ) : filteredTests.length === 0 ? (
          /* Empty State UI */
          <div className="flex flex-col items-center justify-center py-20 px-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-3xl border border-dashed border-primary/20 animate-fade-in mx-auto mt-8 w-full max-w-4xl shadow-sm">
            <div className="w-48 h-48 mb-6 relative opacity-80 mix-blend-multiply">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
                <path fill="#3525cd" fillOpacity="0.05" d="M47.7,-64.3C58.6,-51.7,62.2,-31.8,66.6,-13.2C71,5.3,76.3,22.6,69.5,35.1C62.7,47.6,43.9,55.3,25.4,61.9C6.9,68.4,-11.2,73.8,-28,68.8C-44.8,63.7,-60.2,48,-69.1,30.3C-78,12.6,-80.4,-7.1,-73.4,-22.4C-66.4,-37.8,-49.9,-48.9,-34.5,-60.4C-19.1,-72,-4.7,-84,8.5,-82C21.6,-80.1,36.7,-77,47.7,-64.3Z" transform="translate(100 100)" />
                <rect x="65" y="55" width="70" height="90" rx="12" fill="#fff" stroke="#3525cd" strokeWidth="4" />
                <line x1="85" y1="80" x2="115" y2="80" stroke="#f6f6fc" strokeWidth="6" strokeLinecap="round" />
                <line x1="85" y1="100" x2="115" y2="100" stroke="#f6f6fc" strokeWidth="6" strokeLinecap="round" />
                <path d="M90 135 C95 125, 105 125, 110 135" stroke="#3525cd" strokeWidth="4" fill="none" strokeLinecap="round" />
                <circle cx="140" cy="140" r="18" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="3" />
                <path d="M133 140 L137 144 L146 135" stroke="#0ea5e9" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold font-headline text-on-surface mb-3 tracking-tight text-center">No Tests Available</h2>
            <p className="text-on-surface-variant max-w-sm text-center mb-10 leading-relaxed text-base">
              Your teacher hasn&apos;t assigned any tests yet. Sit back, relax in your cognitive sanctuary, or try refreshing!
            </p>
            <button 
              onClick={() => setIsLoading(true) || setTimeout(() => setIsLoading(false), 800)}
              className="flex items-center gap-2 bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white px-10 py-4 rounded-full font-bold transition-all shadow-sm active:scale-95 group text-lg"
            >
              <span className="material-symbols-outlined text-[24px] group-hover:rotate-180 transition-transform duration-500">refresh</span>
              Refresh Assigned Tests
            </button>
          </div>
        ) : (
          /* Test Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test, index) => {
              const statusCfg = getStatusBadge(test.status);
              const actionBtn = getActionButtonConfig(test.status);
              
              return (
                <article 
                  key={test.id} 
                  className={`bg-white rounded-2xl p-7 shadow-ambient border border-outline-variant/10 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in group relative overflow-hidden`}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Glowing background blob on hover */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  
                  <div className="relative z-10">
                    {/* Header: Difficulty & Status */}
                    <div className="flex justify-between items-start mb-5 gap-2 flex-wrap">
                       <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border shadow-sm ${getDifficultyBadge(test.difficulty)}`}>
                        {test.difficulty}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          <span className="material-symbols-outlined text-[12px]">assignment_ind</span>
                          Assigned
                        </span>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${statusCfg.bg} ${statusCfg.text}`}>
                          <span className={`w-2 h-2 rounded-full ${statusCfg.dot} animate-pulse shadow-sm`} />
                          {test.status}
                        </div>
                      </div>
                    </div>

                    {/* Test Info */}
                    <h2 className="text-xl font-extrabold text-on-surface mb-2 font-headline leading-tight group-hover:text-primary transition-colors pr-4">
                      {test.title}
                    </h2>
                    <p className="text-sm font-bold tracking-wide text-secondary mb-6 uppercase">{test.topic}</p>

                    <div className="flex items-center gap-5 text-on-surface-variant text-sm font-bold mb-8 bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20 shadow-inner">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">format_list_numbered</span>
                        <span>{test.numQuestions} Qs</span>
                      </div>
                      <div className="w-px h-5 bg-outline-variant/30"></div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">schedule</span>
                        <span>{test.timeLimit} mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => {
                      if (test.status === 'Completed') {
                        router.push(`/test/${test.id}/results`);
                      } else {
                        router.push(`/test/${test.id}`);
                      }
                    }}
                    className={`relative z-10 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all duration-300 active:scale-[0.98] ${actionBtn.classes} ${test.status === 'Completed' ? 'hover:bg-outline-variant/10' : ''}`}
                  >
                    <span>{actionBtn.label}</span>
                    <span className="material-symbols-outlined text-[20px] font-bold">{actionBtn.icon}</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Decorative gradient background across the whole screen */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/40 via-surface to-purple-50/40" />

      <BottomNav variant="student" />
    </div>
  );
}
