'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import AIAssistantChat from '../components/AIAssistantChat';
import AnimatedNumber from '../components/AnimatedNumber';
import Skeleton from '../components/Skeleton';
import { ref, onValue } from 'firebase/database';
import { db } from '../../lib/firebase';
import { useAuthUser } from '../hooks/useAuthUser';
import toast from 'react-hot-toast';

// ─── Pure-SVG Line Chart ──────────────────────────────────────────────────────
function LineChart({ data, height = 160 }) {
  const w = 800;
  const h = height;
  const pad = 20;

  // ── 0 data points ── empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-on-surface-variant/50">
        <span className="material-symbols-outlined text-3xl opacity-40">bar_chart</span>
        <p className="text-sm font-medium">No submissions yet. Publish a test to get started.</p>
      </div>
    );
  }

  // ── 1 data point ── snapshot view (dots + labels, no polyline)
  if (data.length === 1) {
    const d = data[0];
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{d.label} — First Submission</p>
        <div className="flex items-center gap-10">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-primary/10 border-4 border-primary flex items-center justify-center">
              <span className="text-lg font-black text-primary">{d.accuracy}%</span>
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Accuracy</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-secondary/10 border-4 border-secondary flex items-center justify-center">
              <span className="text-lg font-black text-secondary">{d.engagement}%</span>
            </div>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Engagement</span>
          </div>
        </div>
        <p className="text-[10px] text-on-surface-variant/60">More submissions will build the trend line</p>
      </div>
    );
  }

  // ── 2+ data points ── full polyline chart
  const toPoints = (values) => {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    return values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });
  };

  const accPts = toPoints(data.map((d) => d.accuracy));
  const engPts = toPoints(data.map((d) => d.engagement));

  const pStr = (pts) => pts.map(([x, y]) => `${x},${y}`).join(' ');
  const areaPath = (pts) => {
    const [fx] = pts[0];
    const [lx] = pts[pts.length - 1];
    return `M ${pts[0].join(',')} L ${pts.slice(1).map(([x, y]) => `${x},${y}`).join(' L ')} L ${lx},${h - pad} L ${fx},${h - pad} Z`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="t-grad-acc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3525cd" />
          <stop offset="100%" stopColor="#712ae2" />
        </linearGradient>
        <linearGradient id="t-grad-eng" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#712ae2" />
          <stop offset="100%" stopColor="#d2bbff" />
        </linearGradient>
        <linearGradient id="t-fill-acc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3525cd" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3525cd" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="t-fill-eng" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#712ae2" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#712ae2" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Area fills */}
      <path d={areaPath(accPts)} fill="url(#t-fill-acc)" />
      <path d={areaPath(engPts)} fill="url(#t-fill-eng)" />

      {/* Lines */}
      <polyline points={pStr(accPts)} fill="none" stroke="url(#t-grad-acc)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={pStr(engPts)} fill="none" stroke="url(#t-grad-eng)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />

      {/* Dots on each data point */}
      {accPts.map(([x, y], i) => (
        <circle key={`a${i}`} cx={x} cy={y} r="5" fill="white" stroke="#3525cd" strokeWidth="2.5" />
      ))}
      {engPts.map(([x, y], i) => (
        <circle key={`e${i}`} cx={x} cy={y} r="4" fill="white" stroke="#712ae2" strokeWidth="2" />
      ))}
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const [analyticsTree, setAnalyticsTree] = useState(null);
  const [usersMap, setUsersMap] = useState({});
  const [teacherTestIds, setTeacherTestIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      setTimeout(() => setIsLoading(false), 0);
    }
  }, [authLoading, user, router]);

  // ── Teacher's own tests — used to scope analytics ──
  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, 'tests'), (snap) => {
      const ids = new Set();
      if (snap.exists()) {
        snap.forEach((child) => {
          if (child.val().createdBy === user.uid) ids.add(child.key);
        });
      }
      setTeacherTestIds(ids);
    });
    return () => unsub();
  }, [user]);

  // ── Users listener (to get student names) ──
  useEffect(() => {
    if (!user) return;
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snap) => {
      setUsersMap(snap.exists() ? snap.val() : {});
    });
    return () => unsub();
  }, [user]);

  // ── Analytics listener — scoped only to /analytics, not full DB ──
  useEffect(() => {
    if (!user) return;
    const analyticsRef = ref(db, 'analytics');
    const unsub = onValue(analyticsRef, (snap) => {
      const data = snap.exists() ? snap.val() : {};
      setAnalyticsTree(data);
      setIsLoading(false);

      if (!isInitialLoad.current) {
        toast.success('New analytics data in 📊\nClass metrics have been updated.');
      }
      isInitialLoad.current = false;
    });
    return () => unsub();
  }, [user]);

  // ── Computed aggregates — scoped to teacher's own tests ──
  const {
    classAvgAccuracy,
    classAvgEngagement,
    needingHelpCount,
    totalParticipants,
    conceptAggregates,
    studentRows,
    chartData,
    smartInsights,
  } = useMemo(() => {
    if (!analyticsTree) {
      return {
        classAvgAccuracy: 0,
        classAvgEngagement: 0,
        needingHelpCount: 0,
        totalParticipants: 0,
        conceptAggregates: {},
        studentRows: [],
        chartData: [],
        smartInsights: [],
      };
    }

    let totalAcc = 0, totalEng = 0, helpCount = 0, participantCount = 0;
    const conceptTotals = {};
    const studentRows = [];
    const timeSeriesMap = {};

    for (const [studentId, testMap] of Object.entries(analyticsTree)) {
      if (!testMap || typeof testMap !== 'object') continue;

      // Filter to only entries for this teacher's tests
      const entries = Object.entries(testMap)
        .filter(([testId]) => teacherTestIds.has(testId))
        .map(([, data]) => data);

      if (entries.length === 0) continue; // student hasn't taken any of this teacher's tests

      participantCount++;
      const latestEntry = [...entries].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))[0];

      // understandingScore is what the analytics engine stores; fall back to accuracy for legacy entries
      const avgAcc = Math.round(entries.reduce((s, e) => s + (e.understandingScore ?? e.accuracy ?? 0), 0) / entries.length);
      const avgEng = Math.round(entries.reduce((s, e) => s + (e.engagementScore || 0), 0) / entries.length);

      totalAcc += avgAcc;
      totalEng += avgEng;
      if (avgAcc < 60) helpCount++;

      // Per-student row data
      const userData = usersMap[studentId] || {};
      studentRows.push({
        id: studentId,
        name: userData.name || `Student ${studentId.slice(0, 6)}`,
        score: avgAcc,
        engagement: avgEng,
        testsCompleted: entries.length,
        lastTest: latestEntry.testTitle || 'Unknown Test',
        weakAreas: latestEntry.weakAreas || [],
        status: avgAcc >= 75 ? 'Excelling' : avgAcc >= 55 ? 'Stable' : 'At Risk',
      });

      // Concept aggregation across all entries
      for (const entry of entries) {
        const cwp = entry.conceptWisePerformance || {};
        for (const [concept, perf] of Object.entries(cwp)) {
          if (!conceptTotals[concept]) conceptTotals[concept] = { sum: 0, count: 0 };
          conceptTotals[concept].sum += perf;
          conceptTotals[concept].count += 1;
        }

        // Time series bucketed by day
        if (entry.submittedAt) {
          const day = new Date(entry.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!timeSeriesMap[day]) timeSeriesMap[day] = { acc: 0, eng: 0, count: 0 };
          timeSeriesMap[day].acc += (entry.understandingScore ?? entry.accuracy ?? 0);
          timeSeriesMap[day].eng += entry.engagementScore || 0;
          timeSeriesMap[day].count += 1;
        }
      }
    }

    // Concept averages
    const conceptAggregates = {};
    for (const [concept, { sum, count }] of Object.entries(conceptTotals)) {
      conceptAggregates[concept] = Math.round(sum / count);
    }

    // Sort student rows by score desc
    studentRows.sort((a, b) => b.score - a.score);

    // Chart data — sorted by date
    const chartData = Object.entries(timeSeriesMap)
      .map(([day, { acc, eng, count }]) => ({
        label: day,
        accuracy: Math.round(acc / count),
        engagement: Math.round(eng / count),
      }))
      .sort((a, b) => new Date(a.label) - new Date(b.label))
      .slice(-8); // last 8 data points

    const classAvgAccuracy = participantCount ? Math.round(totalAcc / participantCount) : 0;
    const classAvgEngagement = participantCount ? Math.round(totalEng / participantCount) : 0;

    // Smart insights strings
    const smartInsights = [];
    for (const [concept] of Object.entries(conceptAggregates)) {
      const pct = studentRows.filter((s) => (s.weakAreas || []).includes(concept)).length;
      const ratio = participantCount > 0 ? Math.round((pct / participantCount) * 100) : 0;
      if (ratio >= 50) smartInsights.push(`${ratio}% of students are weak in ${concept}`);
    }
    const atRiskStudents = studentRows.filter((s) => s.status === 'At Risk');
    atRiskStudents.forEach((s) => {
      smartInsights.push(`${s.name} needs attention (score: ${s.score}%)`);
    });

    return {
      classAvgAccuracy,
      classAvgEngagement,
      needingHelpCount: helpCount,
      totalParticipants: participantCount,
      conceptAggregates,
      studentRows,
      chartData,
      smartInsights,
    };
  }, [analyticsTree, usersMap, teacherTestIds]);

  const recentSubmissions = useMemo(() => {
    if (!analyticsTree) return [];
    const results = [];
    Object.entries(analyticsTree || {}).forEach(([studentId, tests]) => {
      Object.entries(tests || {}).forEach(([testId, analytics]) => {
        if (teacherTestIds.has(testId)) {
          const userData = usersMap[studentId] || {};
          results.push({
            studentId,
            testId,
            studentName: userData.name || `Student ${studentId.slice(0, 6)}`,
            ...analytics
          });
        }
      });
    });
    return results.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  }, [analyticsTree, usersMap, teacherTestIds]);

  const metricCards = [
    {
      id: 'engagement', icon: 'bolt', label: 'Avg Engagement',
      value: <AnimatedNumber value={classAvgEngagement} suffix="%" />,
      iconBg: 'bg-primary-fixed text-primary',
      badge: classAvgEngagement >= 70 ? '+Live' : null,
      badgeBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    },
    {
      id: 'understanding', icon: 'psychology', label: 'Avg Accuracy',
      value: <AnimatedNumber value={classAvgAccuracy} suffix="%" />,
      iconBg: 'bg-secondary-fixed text-secondary',
      badge: classAvgAccuracy < 60 ? '⚠ Low' : null,
      badgeBg: 'bg-error-container text-on-error-container',
    },
    {
      id: 'needing-help', icon: 'warning', label: 'Needing Help',
      value: <AnimatedNumber value={needingHelpCount} />,
      iconBg: 'bg-error-container/30 text-error',
      badge: null, badgeBg: '',
    },
    {
      id: 'participants', icon: 'group', label: 'Participants',
      value: <>{totalParticipants}</>,
      iconBg: 'bg-surface-container text-on-surface',
      badge: 'LIVE', badgeBg: 'bg-surface-container-high text-on-surface-variant',
    },
  ];

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen">
      <AppHeader variant="teacher" />

      <div className="min-h-screen">

        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-4 md:p-10 pb-32 lg:pb-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <div>
              <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">Focus-Flow</h1>
              <p className="text-on-surface-variant font-medium flex items-center gap-2">
                Live Analytics
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  LIVE
                </span>
              </p>
            </div>
            <Link href="/teacher/create-test">
              <button
                type="button"
                className="bg-gradient-to-br from-primary to-secondary text-white px-8 py-3.5 rounded-full font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
                Create Test
              </button>
            </Link>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10" aria-label="Live class metrics">
            {metricCards.map((m) => (
              <div key={m.id} className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
                {isLoading ? (
                  <><Skeleton className="h-10 w-10 mb-4" /><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-20" /></>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-lg ${m.iconBg}`}>
                        <span className="material-symbols-outlined" aria-hidden="true">{m.icon}</span>
                      </div>
                      {m.badge && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${m.badgeBg}`}>{m.badge}</span>
                      )}
                    </div>
                    <p className="text-on-surface-variant text-sm font-medium mb-1">{m.label}</p>
                    <h2 className="text-3xl font-black text-on-surface">{m.value}</h2>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* Live Trend Chart */}
            <section aria-label="Live class performance trends" className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="font-headline text-xl font-bold">Live Performance Trends</h2>
                  <p className="text-xs text-on-surface-variant mt-1">Class average per submission day</p>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium text-on-surface-variant">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary" /> Accuracy</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-secondary" /> Engagement</span>
                </div>
              </div>
              <div className="h-40">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <LineChart data={chartData} height={160} />
                )}
              </div>
              {!isLoading && chartData.length > 1 && (
                <div className="flex justify-between mt-4 text-[10px] text-on-surface-variant font-bold uppercase tracking-tighter px-2">
                  {chartData.map((d, i) => <span key={i}>{d.label}</span>)}
                </div>
              )}
            </section>

            {/* Concept Accuracy */}
            <section aria-label="Concept accuracy breakdown" className="bg-surface-container-low p-8 rounded-xl">
              <h2 className="font-headline text-xl font-bold mb-6">Concept Accuracy</h2>
              {isLoading ? (
                <div className="space-y-5">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : Object.keys(conceptAggregates).length > 0 ? (
                <div className="space-y-5">
                  {Object.entries(conceptAggregates)
                    .sort((a, b) => a[1] - b[1]) // weakest first
                    .slice(0, 6)
                    .map(([concept, avg]) => {
                      const barColor = avg >= 75 ? 'bg-primary' : avg >= 50 ? 'bg-secondary' : 'bg-error';
                      const textColor = avg >= 75 ? 'text-primary' : avg >= 50 ? 'text-secondary' : 'text-error';
                      return (
                        <div key={concept} className="space-y-1.5">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="truncate pr-2">{concept}</span>
                            <span className={textColor}>{avg}%</span>
                          </div>
                          <div className="h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${avg}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-10 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">bar_chart</span>
                  <p className="text-sm">No concept data yet.</p>
                </div>
              )}

              {/* Smart Insights */}
              {!isLoading && smartInsights.length > 0 && (
                <div className="mt-8 p-4 bg-secondary-container/10 rounded-xl border border-secondary/20 space-y-2">
                  <div className="flex items-center gap-2 text-secondary font-bold text-sm mb-3">
                    <span className="material-symbols-outlined text-[18px] fill-icon" aria-hidden="true">auto_awesome</span>
                    Smart Insights
                  </div>
                  {smartInsights.slice(0, 3).map((insight, i) => (
                    <p key={i} className="text-xs text-on-surface font-medium leading-relaxed flex items-start gap-2">
                      <span className="text-secondary mt-0.5">•</span>
                      {insight}
                    </p>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Recent Submissions Table */}
          <section aria-label="Recent Submissions" className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10 mb-10">
            <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="font-headline text-xl font-bold">Recent Submissions</h2>
              <span className="text-xs font-bold text-on-surface-variant">
                Live Updates
              </span>
            </div>
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : recentSubmissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low/50 text-on-surface-variant uppercase text-[10px] font-black tracking-widest">
                      {['Student Name', 'Test Name', 'Score', 'Accuracy', 'Submission Time'].map((h) => (
                        <th key={h} className="px-8 py-4" scope="col">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {recentSubmissions.slice(0, 10).map((sub, i) => {
                      const timeString = sub.submittedAt 
                        ? new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : '—';
                      const dateString = sub.submittedAt 
                        ? new Date(sub.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) 
                        : '';
                      return (
                        <tr key={`${sub.studentId}-${sub.testId}-${i}`} className="hover:bg-surface-container-low transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-black text-sm flex-shrink-0">
                                {sub.studentName.charAt(0).toUpperCase()}
                              </div>
                              <p className="font-bold text-sm">{sub.studentName}</p>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-on-surface-variant">
                            {sub.testTitle || 'Untitled Test'}
                          </td>
                          <td className="px-8 py-5">
                            <span className="font-bold text-sm text-on-surface">{sub.score} / {sub.totalQuestions || '-'}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`font-black text-sm ${sub.accuracy >= 70 ? 'text-primary' : sub.accuracy >= 50 ? 'text-secondary' : 'text-error'}`}>
                              {sub.accuracy}%
                            </span>
                          </td>
                          <td className="px-8 py-5 text-xs text-on-surface-variant font-medium">
                            {dateString} {timeString}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-3 block opacity-30">history</span>
                <p className="text-sm">No recent submissions found.</p>
              </div>
            )}
          </section>

          {/* Student Table */}
          <section aria-label="Live student analytics" className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
            <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="font-headline text-xl font-bold">Student Performance</h2>
              <span className="text-xs font-bold text-on-surface-variant">
                {totalParticipants} student{totalParticipants !== 1 ? 's' : ''} tracked
              </span>
            </div>
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : studentRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low/50 text-on-surface-variant uppercase text-[10px] font-black tracking-widest">
                      {['Student', 'Avg. Score', 'Engagement', 'Tests Done', 'Weak Areas', 'Status'].map((h) => (
                        <th key={h} className="px-8 py-4" scope="col">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {studentRows.map((s) => {
                      const statusBg =
                        s.status === 'Excelling' ? 'bg-tertiary-fixed text-on-tertiary-fixed' :
                        s.status === 'At Risk' ? 'bg-error-container text-on-error-container' :
                        'bg-primary-fixed text-on-primary-fixed';
                      const engColor = s.engagement >= 70 ? 'bg-primary' : s.engagement >= 45 ? 'bg-secondary' : 'bg-error';
                      const engLabel = s.engagement >= 70 ? 'High' : s.engagement >= 45 ? 'Avg' : 'Low';
                      const engText = s.engagement >= 70 ? 'text-primary' : s.engagement >= 45 ? 'text-secondary' : 'text-error';

                      return (
                        <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm flex-shrink-0">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-sm">{s.name}</p>
                                <p className="text-[10px] text-on-surface-variant truncate max-w-[140px]">{s.lastTest}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`font-black text-sm ${s.score >= 70 ? 'text-primary' : 'text-error'}`}>{s.score}%</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                <div className={`h-full ${engColor} rounded-full`} style={{ width: `${s.engagement}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${engText}`}>{engLabel}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="font-bold text-sm text-on-surface">{s.testsCompleted}</span>
                          </td>
                          <td className="px-8 py-5 max-w-[160px]">
                            {s.weakAreas && s.weakAreas.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {s.weakAreas.slice(0, 2).map((w, i) => (
                                  <span key={i} className="text-[10px] font-bold bg-error/10 text-error px-2 py-0.5 rounded-sm line-clamp-1">{w}</span>
                                ))}
                                {s.weakAreas.length > 2 && <span className="text-[10px] text-on-surface-variant">+{s.weakAreas.length - 2}</span>}
                              </div>
                            ) : (
                              <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">None</span>
                            )}
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${statusBg}`}>{s.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20 text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl mb-4 block opacity-30">group</span>
                <h3 className="font-headline text-lg font-bold text-on-surface mb-2">No Student Data Yet</h3>
                <p className="text-sm max-w-xs mx-auto">
                  Publish a test and have students submit attempts — results will appear here in real time.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>

      <AIAssistantChat />
      <BottomNav variant="teacher" />
    </div>
  );
}
