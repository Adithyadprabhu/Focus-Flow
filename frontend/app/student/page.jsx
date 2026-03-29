'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import GradientFAB from '../components/GradientFAB';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../../lib/firebase';

// ─── Pure-SVG Line Chart ──────────────────────────────────────────────────────
function LineChart({ data, color = '#3525cd', height = 120 }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-on-surface-variant text-sm font-medium opacity-60">
        Complete more tests to see your trend
      </div>
    );
  }

  const w = 600;
  const h = height;
  const pad = 12;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.value - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  // filled area path
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = `M ${first} L ${polyline.split(' ').slice(1).join(' L ')} L ${last.split(',')[0]},${h - pad} L ${first.split(',')[0]},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chart-fill)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = h - pad - ((d.value - min) / range) * (h - pad * 2);
        return (
          <circle key={i} cx={x} cy={y} r="5" fill="white" stroke={color} strokeWidth="2.5" />
        );
      })}
    </svg>
  );
}

// ─── Animated Number ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const start = display;
    const end = Number(value) || 0;
    const duration = 700;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{display}{suffix}</span>;
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`bg-surface-container-high animate-pulse rounded-xl ${className}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [analyticsMap, setAnalyticsMap] = useState(null); // { [testId]: analyticsObj }
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const isInitialLoad = useRef(true);

  // ── Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Real-time analytics listener ──
  useEffect(() => {
    if (!user) return;

    const analyticsRef = ref(db, `analytics/${user.uid}`);
    const unsub = onValue(analyticsRef, (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : {};
      setAnalyticsMap(data);
      setIsLoading(false);

      if (!isInitialLoad.current) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      }
      isInitialLoad.current = false;
    });

    return () => unsub();
  }, [user]);

  // ── Derived metrics ──
  const allEntries = analyticsMap
    ? Object.entries(analyticsMap)
        .map(([testId, a]) => ({ testId, ...a }))
        .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))
    : [];

  const latest = allEntries[0] || null;
  const latestScore = latest ? latest.score || 0 : 0;
  const latestTotal = latest ? latest.totalQuestions || 1 : 1;
  const latestAccuracy = latest ? latest.accuracy || 0 : 0;
  const latestEngagement = latest ? latest.engagementScore || 0 : 0;
  const weakAreas = latest ? (latest.weakAreas || []) : [];
  const concepts = latest ? (latest.conceptWisePerformance || {}) : {};

  // Historical accuracy for chart (oldest → newest)
  const chartData = [...allEntries]
    .reverse()
    .map((e) => ({ label: e.testTitle || e.testId, value: e.accuracy || 0 }));

  // Overall average accuracy
  const avgAccuracy = allEntries.length
    ? Math.round(allEntries.reduce((s, e) => s + (e.accuracy || 0), 0) / allEntries.length)
    : 0;

  const topWeakArea = weakAreas[0] || null;

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      <AppHeader variant="student" />

      {/* Analytics Updated Toast */}
      <div
        className={`fixed top-24 right-4 z-50 bg-white border border-primary/20 shadow-xl rounded-2xl px-5 py-4 flex items-center gap-3 transition-all duration-500 ${
          showToast ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'
        }`}
        role="alert"
        aria-live="polite"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <span className="material-symbols-outlined text-xl">insights</span>
        </div>
        <div>
          <p className="font-bold text-sm text-on-surface">Analytics updated 📊</p>
          <p className="text-xs text-on-surface-variant">Your latest results are live.</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-8 pb-32">

        {/* Welcome */}
        <section className="mb-10" aria-label="Welcome">
          <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface mb-2 tracking-tight font-headline">
            Hi {user?.displayName?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-on-surface-variant text-lg">Ready to reach your flow state today?</p>
        </section>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10" aria-label="Live performance stats">

          {/* Latest Score */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col gap-3">
            {isLoading ? (
              <><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-10 w-32" /></>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl">grade</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Latest Score</p>
                </div>
                <p className="text-4xl font-black text-on-surface">
                  {latest ? (
                    <><AnimatedNumber value={latestScore} /><span className="text-lg text-on-surface-variant font-bold">/{latestTotal}</span></>
                  ) : '—'}
                </p>
                {latest && (
                  <p className="text-xs text-on-surface-variant font-medium truncate">{latest.testTitle || 'Recent Test'}</p>
                )}
              </>
            )}
          </div>

          {/* Accuracy Meter */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col gap-3">
            {isLoading ? (
              <><Skeleton className="h-4 w-28 mb-2" /><Skeleton className="h-10 w-24" /><Skeleton className="h-2 w-full mt-2" /></>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary text-xl">target</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Accuracy</p>
                </div>
                <p className="text-4xl font-black text-on-surface">
                  <AnimatedNumber value={latestAccuracy} suffix="%" />
                </p>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden" role="progressbar" aria-valuenow={latestAccuracy} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-700"
                    style={{ width: `${latestAccuracy}%` }}
                  />
                </div>
                <p className="text-xs text-on-surface-variant">Avg across all tests: {avgAccuracy}%</p>
              </>
            )}
          </div>

          {/* Engagement Score */}
          <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 shadow-md text-white flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            {isLoading ? (
              <><Skeleton className="h-4 w-24 mb-2 bg-white/20" /><Skeleton className="h-10 w-20 bg-white/20" /></>
            ) : (
              <>
                <div className="flex items-center gap-2 relative z-10">
                  <span className="material-symbols-outlined text-white/80 text-xl">vital_signs</span>
                  <p className="text-sm font-bold text-white/80 uppercase tracking-wider">Engagement</p>
                </div>
                <p className="text-4xl font-black relative z-10">
                  <AnimatedNumber value={latestEngagement} suffix="%" />
                </p>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden relative z-10">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${latestEngagement}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* Performance Trend Chart */}
            <section aria-label="Accuracy trend over time" className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold font-headline">Accuracy Trend</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">Performance across your completed tests</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  Accuracy %
                </div>
              </div>
              <div className="h-36">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <LineChart data={chartData} color="#3525cd" height={144} />
                )}
              </div>
              {!isLoading && chartData.length > 1 && (
                <div className="flex justify-between mt-3 text-[10px] text-on-surface-variant font-bold uppercase tracking-wider overflow-hidden">
                  {chartData.map((d, i) => (
                    <span key={i} className="truncate max-w-[80px] text-center">{d.label}</span>
                  ))}
                </div>
              )}
            </section>

            {/* Concept Proficiency */}
            <section aria-label="Concept-wise performance" className="bg-surface-container-low rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-headline">Concept Proficiency</h2>
                {latest && <span className="text-xs font-bold text-on-surface-variant">{latest.testTitle}</span>}
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : Object.keys(concepts).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(concepts).map(([concept, perf]) => {
                    const isWeak = perf < 60;
                    return (
                      <div key={concept} className="bg-white rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm group">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`material-symbols-outlined text-xl ${isWeak ? 'text-error' : 'text-primary'}`}>
                            {isWeak ? 'trending_down' : 'trending_up'}
                          </span>
                          <span className="font-semibold text-sm truncate">{concept}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="w-28 h-2 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${perf >= 75 ? 'bg-primary' : perf >= 50 ? 'bg-secondary' : 'bg-error'}`}
                              style={{ width: `${perf}%` }}
                            />
                          </div>
                          <span className={`text-xs font-black w-10 text-right ${perf >= 75 ? 'text-primary' : perf >= 50 ? 'text-secondary' : 'text-error'}`}>
                            {perf}%
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isWeak ? 'bg-error-container text-on-error-container' : perf >= 80 ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isWeak ? 'Weak' : perf >= 80 ? 'Strong' : 'Moderate'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-5xl mb-3 block opacity-40">school</span>
                  <p className="text-sm font-medium">No concept data yet. Complete a test to see your breakdown!</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col gap-8">

            {/* AI Insights */}
            <section aria-label="AI Insights" className="bg-secondary-container text-on-secondary-container rounded-2xl p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" aria-hidden="true" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-white animate-pulse" aria-hidden="true">auto_awesome</span>
                  <h2 className="font-bold text-xl">AI Insights</h2>
                </div>
                {isLoading ? (
                  <>
                    <Skeleton className="h-4 w-full mb-2 bg-white/20" />
                    <Skeleton className="h-4 w-3/4 mb-6 bg-white/20" />
                    <Skeleton className="h-10 w-full bg-white/20" />
                  </>
                ) : topWeakArea ? (
                  <>
                    <p className="text-white/90 leading-relaxed mb-6 italic text-sm">
                      &quot;Your accuracy in <strong className="text-white">{topWeakArea}</strong> is below 60%.
                      Revisiting the core principles of this topic will meaningfully boost your next test score.&quot;
                    </p>
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-white/60">Suggested Action</p>
                      <button
                        type="button"
                        className="w-full bg-white text-secondary py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">menu_book</span>
                        Revise {topWeakArea}
                      </button>
                    </div>
                  </>
                ) : allEntries.length > 0 ? (
                  <p className="text-white/90 leading-relaxed italic text-sm">
                    &quot;Excellent work! You have no weak areas in your latest test.
                    Keep your momentum going and challenge yourself with harder concepts! 🎉&quot;
                  </p>
                ) : (
                  <p className="text-white/90 leading-relaxed italic text-sm">
                    &quot;Complete your first test to unlock personalised AI insights powered by your real performance data.&quot;
                  </p>
                )}
              </div>
            </section>

            {/* Weak Areas Panel */}
            {!isLoading && weakAreas.length > 0 && (
              <section aria-label="Weak areas" className="bg-error-container/20 border border-error/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-error text-xl">warning</span>
                  <h3 className="font-bold text-on-surface">Areas Needing Attention</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {weakAreas.map((area) => (
                    <span key={area} className="px-3 py-1.5 bg-error/10 border border-error/25 text-error text-xs font-bold rounded-full">
                      {area}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Test History */}
            <section aria-label="Test history" className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10">
              <h2 className="font-bold text-lg mb-5 font-headline">Test History</h2>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : allEntries.length > 0 ? (
                <div className="space-y-3">
                  {allEntries.slice(0, 5).map((entry) => (
                    <div key={entry.testId} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{entry.testTitle || 'Test'}</p>
                        <p className="text-[10px] text-on-surface-variant">{entry.subject || 'General'}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className={`font-black text-sm ${entry.accuracy >= 70 ? 'text-primary' : 'text-error'}`}>
                          {entry.accuracy}%
                        </p>
                        <p className="text-[10px] text-on-surface-variant">{entry.score}/{entry.totalQuestions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">history</span>
                  <p className="text-sm font-medium">No tests completed yet.</p>
                </div>
              )}
            </section>

          </div>
        </div>
      </main>

      <GradientFAB href="/test" icon="smart_toy" label="View My Tests" />
      <BottomNav variant="student" />
    </div>
  );
}
