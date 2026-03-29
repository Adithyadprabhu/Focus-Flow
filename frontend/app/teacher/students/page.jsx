'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../../../lib/firebase';
import AppHeader from '../../components/AppHeader';
import BottomNav from '../../components/BottomNav';

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [analyticsTree, setAnalyticsTree] = useState(null);
  const [usersMap, setUsersMap] = useState({});
  const [teacherTestIds, setTeacherTestIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('score');

  // ── Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/'); return; }
      setUser(u);
    });
    return () => unsub();
  }, [router]);

  // ── Teacher's Tests & Analytics (Sequential) ──
  useEffect(() => {
    if (!user) return;

    let analyticsUnsub = null;

    const testsUnsub = onValue(ref(db, 'tests'), (testSnap) => {
      const ids = new Set();
      if (testSnap.exists()) {
        testSnap.forEach((child) => {
          if (child.val().createdBy === user.uid) ids.add(child.key);
        });
      }
      setTeacherTestIds(ids);
      console.log("Teacher Tests [Students Page]:", Array.from(ids));

      // Once tests are fetched, listen to analytics
      if (!analyticsUnsub) {
        analyticsUnsub = onValue(ref(db, 'analytics'), (analyticsSnap) => {
          const data = analyticsSnap.exists() ? analyticsSnap.val() : {};
          setAnalyticsTree(data);
          console.log("Analytics Data [Students Page]:", data);
          setIsLoading(false);
        });
      }
    });

    return () => {
      testsUnsub();
      if (analyticsUnsub) analyticsUnsub();
    };
  }, [user]);

  // ── Users ──
  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, 'users'), (snap) => {
      setUsersMap(snap.exists() ? snap.val() : {});
    });
    return () => unsub();
  }, [user]);

  // ── Build student rows — scoped to this teacher's tests ──
  const studentRows = useMemo(() => {
    if (!analyticsTree || teacherTestIds.size === 0) return [];
    const rows = [];

    for (const [studentId, testMap] of Object.entries(analyticsTree)) {
      if (!testMap || typeof testMap !== 'object') continue;

      // Only analytics entries for tests this teacher created
      const entries = Object.entries(testMap)
        .filter(([testId]) => teacherTestIds.has(testId))
        .map(([, data]) => data);

      if (!entries.length) continue;

      const sorted = [...entries].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
      const latest = sorted[0];
      const avgAcc = Math.round(entries.reduce((s, e) => s + (e.understandingScore ?? e.accuracy ?? 0), 0) / entries.length);
      const avgEng = Math.round(entries.reduce((s, e) => s + (e.engagementScore || 0), 0) / entries.length);

      const userData = usersMap[studentId] || {};
      const status = avgAcc >= 75 ? 'Excelling' : avgAcc >= 55 ? 'Stable' : 'At Risk';

      // Collect all weak areas across all tests
      const allWeak = [...new Set(entries.flatMap((e) => e.weakAreas || []))];

      rows.push({
        id: studentId,
        name: userData.name || `Student ${studentId.slice(0, 6)}`,
        email: userData.email || '—',
        avgScore: avgAcc,
        avgEngagement: avgEng,
        testsCompleted: entries.length,
        lastTest: latest.testTitle || 'Unknown Test',
        lastSubmitted: latest.submittedAt || 0,
        status,
        weakAreas: allWeak.slice(0, 3),
      });
    }
    return rows;
  }, [analyticsTree, usersMap, teacherTestIds]);

  // ── Filter + Sort ──
  const processedRows = useMemo(() => {
    let rows = studentRows.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (filter === 'Excelling') return s.status === 'Excelling';
      if (filter === 'At Risk') return s.status === 'At Risk';
      if (filter === 'Stable') return s.status === 'Stable';
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === 'score') return b.avgScore - a.avgScore;
      if (sortBy === 'engagement') return b.avgEngagement - a.avgEngagement;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [studentRows, searchQuery, filter, sortBy]);

  // ── Aggregate stats ──
  const totalStudents = studentRows.length;
  const atRiskCount = studentRows.filter((s) => s.status === 'At Risk').length;
  const excellingCount = studentRows.filter((s) => s.status === 'Excelling').length;
  const classAvg = totalStudents
    ? Math.round(studentRows.reduce((s, r) => s + r.avgScore, 0) / totalStudents)
    : 0;

  const statusConfig = {
    Excelling: { bg: 'bg-tertiary-fixed text-on-tertiary-fixed', dot: 'bg-green-500' },
    Stable: { bg: 'bg-primary-fixed text-on-primary-fixed', dot: 'bg-primary' },
    'At Risk': { bg: 'bg-error-container text-on-error-container', dot: 'bg-error' },
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-28">
      <AppHeader variant="teacher" />

      <main className="max-w-7xl mx-auto px-6 pt-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/teacher" className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </Link>
              <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight">Students</h1>
            </div>
            <p className="text-on-surface-variant ml-9">Live performance breakdown for every student in your class.</p>
          </div>
          <div className="flex items-center gap-2 ml-9 sm:ml-0">
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          </div>
        </div>

        {/* Class Summary Cards */}
        {!isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Total Students', value: totalStudents, icon: 'group', color: 'bg-primary/10 text-primary' },
              { label: 'Class Avg', value: `${classAvg}%`, icon: 'bar_chart', color: 'bg-secondary/10 text-secondary' },
              { label: 'Excelling', value: excellingCount, icon: 'emoji_events', color: 'bg-tertiary-fixed/60 text-tertiary' },
              { label: 'Needs Help', value: atRiskCount, icon: 'warning', color: 'bg-error-container text-error' },
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

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/40 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['All', 'Excelling', 'Stable', 'At Risk'].map((f) => (
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
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-surface-container-lowest border border-outline-variant/40 rounded-full py-3 pl-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="score">Sort: Score</option>
              <option value="engagement">Sort: Engagement</option>
              <option value="name">Sort: Name</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-sm">expand_more</span>
          </div>
        </div>

        {/* Student Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-surface-container-lowest rounded-2xl animate-pulse border border-outline-variant/10" />
            ))}
          </div>
        ) : processedRows.length > 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/60 text-on-surface-variant uppercase text-[10px] font-black tracking-widest">
                  {['Student', 'Avg Score', 'Engagement', 'Tests Done', 'Weak Areas', 'Status'].map((h) => (
                    <th key={h} className="px-6 py-4" scope="col">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {processedRows.map((s) => {
                  const cfg = statusConfig[s.status] || statusConfig['Stable'];
                  const engColor = s.avgEngagement >= 70 ? 'bg-primary' : s.avgEngagement >= 45 ? 'bg-secondary' : 'bg-error';
                  const engText = s.avgEngagement >= 70 ? 'text-primary' : s.avgEngagement >= 45 ? 'text-secondary' : 'text-error';

                  return (
                    <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-black text-sm flex-shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-on-surface">{s.name}</p>
                            <p className="text-[10px] text-on-surface-variant truncate max-w-[140px]">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${s.avgScore >= 70 ? 'text-primary' : s.avgScore >= 50 ? 'text-secondary' : 'text-error'}`}>
                            {s.avgScore}%
                          </span>
                          <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.avgScore >= 70 ? 'bg-primary' : s.avgScore >= 50 ? 'bg-secondary' : 'bg-error'}`}
                              style={{ width: `${s.avgScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div className={`h-full ${engColor} rounded-full`} style={{ width: `${s.avgEngagement}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${engText}`}>{s.avgEngagement}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-sm text-on-surface">{s.testsCompleted}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {s.weakAreas.length > 0 ? s.weakAreas.map((w) => (
                            <span key={w} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-error/10 border border-error/20 text-error">
                              {w}
                            </span>
                          )) : (
                            <span className="text-[10px] text-on-surface-variant font-medium">None 🎉</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${cfg.bg}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : totalStudents === 0 ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-7xl text-on-surface-variant/30 block mb-4">group</span>
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">No student data yet</h2>
            <p className="text-on-surface-variant text-sm mb-8 max-w-sm mx-auto">
              Publish a test and have your students submit attempts — their performance will appear here in real time.
            </p>
            <Link href="/teacher/create-test">
              <button type="button" className="bg-gradient-to-br from-primary to-secondary text-white px-8 py-3.5 rounded-full font-bold shadow-lg hover:scale-105 transition-all">
                Create a Test
              </button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl block mb-3 opacity-30">search_off</span>
            <p className="font-medium">No students match this filter.</p>
          </div>
        )}
      </main>

      <BottomNav variant="teacher" />
    </div>
  );
}
