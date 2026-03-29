'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../../../lib/firebase';
import AppHeader from '../../components/AppHeader';
import BottomNav from '../../components/BottomNav';

export default function StudentResultsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [analyticsMap, setAnalyticsMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/'); return; }
      setUser(u);
    });
    return () => unsub();
  }, [router]);

  // ── Real-time analytics listener ──
  useEffect(() => {
    if (!user) return;
    const analyticsRef = ref(db, `analytics/${user.uid}`);
    const unsub = onValue(analyticsRef, (snap) => {
      setAnalyticsMap(snap.exists() ? snap.val() : {});
      setIsLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ── Derived entries sorted newest first ──
  const allEntries = analyticsMap
    ? Object.entries(analyticsMap)
        .map(([testId, a]) => ({ testId, ...a }))
        .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))
    : [];

  // ── Filter ──
  const filtered = allEntries.filter((e) => {
    const matchSearch =
      (e.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'Strong') return e.accuracy >= 75;
    if (filter === 'Moderate') return e.accuracy >= 50 && e.accuracy < 75;
    if (filter === 'Weak') return e.accuracy < 50;
    return true;
  });

  // ── Aggregates ──
  const avgAccuracy = allEntries.length
    ? Math.round(allEntries.reduce((s, e) => s + (e.accuracy || 0), 0) / allEntries.length)
    : 0;
  const totalTests = allEntries.length;
  const strongTests = allEntries.filter((e) => e.accuracy >= 75).length;

  const getBadge = (acc) => {
    if (acc >= 75) return { label: 'Strong', bg: 'bg-tertiary-fixed text-on-tertiary-fixed' };
    if (acc >= 50) return { label: 'Moderate', bg: 'bg-amber-100 text-amber-700' };
    return { label: 'Needs Work', bg: 'bg-error-container text-on-error-container' };
  };

  const ScoreRing = ({ value, size = 64 }) => {
    const r = (size / 2) - 6;
    const circ = 2 * Math.PI * r;
    const filled = (value / 100) * circ;
    const color = value >= 75 ? '#4edea3' : value >= 50 ? '#f59e0b' : '#ba1a1a';
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5eeff" strokeWidth="5" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fontSize={size * 0.22} fontWeight="900" fill="#0b1c30">
          {value}%
        </text>
      </svg>
    );
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-28">
      <AppHeader variant="student" />

      <main className="max-w-6xl mx-auto px-6 pt-10">

        {/* Header */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/student" className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight">My Results</h1>
          </div>
          <p className="text-on-surface-variant ml-9">All your completed test analytics in one place.</p>
        </section>

        {/* Summary Cards */}
        {!isLoading && totalTests > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Tests Taken', value: totalTests, icon: 'quiz', color: 'bg-primary/10 text-primary' },
              { label: 'Avg Accuracy', value: `${avgAccuracy}%`, icon: 'target', color: 'bg-secondary/10 text-secondary' },
              { label: 'Strong Results', value: strongTests, icon: 'emoji_events', color: 'bg-tertiary-fixed/80 text-tertiary' },
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
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/40 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2">
            {['All', 'Strong', 'Moderate', 'Weak'].map((f) => (
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

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 h-48 animate-pulse border border-outline-variant/10" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((entry) => {
              const badge = getBadge(entry.accuracy || 0);
              const date = entry.submittedAt
                ? new Date(entry.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—';
              return (
                <Link
                  key={entry.testId}
                  href={`/test/${entry.testId}/results`}
                  className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/10 hover:shadow-md hover:border-primary/20 transition-all group block"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-medium text-on-surface-variant">{date}</span>
                      </div>
                      <h3 className="font-bold text-on-surface text-lg leading-tight truncate group-hover:text-primary transition-colors">
                        {entry.testTitle || 'Untitled Test'}
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-1">{entry.subject || 'General'}</p>

                      {/* Score row */}
                      <div className="flex items-center gap-4 mt-4">
                        <div className="text-center">
                          <p className="text-xs text-on-surface-variant">Score</p>
                          <p className="font-black text-on-surface">{entry.score ?? '—'}/{entry.totalQuestions ?? '—'}</p>
                        </div>
                        <div className="w-px h-8 bg-outline-variant/30" />
                        <div className="text-center">
                          <p className="text-xs text-on-surface-variant">Engagement</p>
                          <p className="font-black text-on-surface">{entry.engagementScore ?? '—'}%</p>
                        </div>
                      </div>

                      {/* Weak areas */}
                      {entry.weakAreas && entry.weakAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {entry.weakAreas.slice(0, 3).map((w) => (
                            <span key={w} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/10 border border-error/20 text-error">
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Accuracy Ring */}
                    <div className="flex-shrink-0">
                      <ScoreRing value={entry.accuracy || 0} size={72} />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-primary text-xs font-bold mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Full Analysis <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : totalTests === 0 ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-7xl text-on-surface-variant/30 block mb-4">emoji_events</span>
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Nothing here yet!</h2>
            <p className="text-on-surface-variant text-sm mb-8 max-w-sm mx-auto">
              Submit your first assigned test to see your results and analytics appear here.
            </p>
            <Link href="/test">
              <button type="button" className="bg-gradient-to-br from-primary to-secondary text-white px-8 py-3.5 rounded-full font-bold shadow-lg hover:scale-105 transition-all">
                Go to My Tests
              </button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl block mb-3 opacity-30">search_off</span>
            <p className="font-medium">No results match your search.</p>
          </div>
        )}
      </main>

      <BottomNav variant="student" />
    </div>
  );
}
