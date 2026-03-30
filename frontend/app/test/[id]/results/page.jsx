'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ref, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../lib/firebase';
import AppHeader from '../../../components/AppHeader';
import BottomNav from '../../../components/BottomNav';

export default function TestAnalyticsResult() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id;

  const [testData, setTestData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async (currentUser) => {
      try {
        // 1. Fetch Test Details
        const testSnap = await get(ref(db, `tests/${testId}`));
        
        if (!testSnap.exists()) {
          router.push('/test');
          return;
        }
        setTestData(testSnap.val());

        // 2. Fetch Analytics for this student & test combination securely mapped by Tree
        const analyticsSnap = await get(ref(db, `analytics/${currentUser.uid}/${testId}`));
        
        if (analyticsSnap.exists()) {
          setAnalytics(analyticsSnap.val());
        } else {
          // If tests were taken before analytics module was live, or processing delay
          console.warn("No analytics found for this attempt yet.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        fetchResults(currentUser);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [testId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface font-body animate-pulse">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-spin">
            <span className="material-symbols-outlined text-primary text-3xl">analytics</span>
          </div>
          <p className="font-bold text-on-surface-variant">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-surface font-body text-on-surface min-h-screen pb-24 relative flex flex-col items-center justify-center px-6">
        <AppHeader variant="student" />
        <div className="max-w-md text-center space-y-6">
          <span className="material-symbols-outlined text-[64px] text-outline-variant">monitor_heart</span>
          <h2 className="text-2xl font-extrabold font-headline text-on-surface">Analytics Processing...</h2>
          <p className="text-on-surface-variant text-sm">
            We are crunching the numbers on your test performance. Please check back in a few minutes!
          </p>
          <button 
            onClick={() => router.push('/test')}
            className="mt-4 px-8 py-3 bg-surface-container-high rounded-full font-bold text-on-surface hover:text-primary transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
        <BottomNav variant="student" />
      </div>
    );
  }

  // Derived properties for UI bindings
  const accScore = analytics.understandingScore ?? analytics.accuracy ?? 0;
  const engScore = analytics.engagementScore || 0;
  const concepts = analytics.conceptWisePerformance || {};
  const weakSpots = analytics.weakAreas || [];

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen pb-24 relative">
      <AppHeader variant="student" />
      
      <main className="max-w-6xl mx-auto px-6 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Top Level Metrics */}
        <section className="lg:col-span-8 space-y-8 animate-fade-in">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button onClick={() => router.push('/test')} className="text-primary font-bold text-sm flex items-center gap-1 mb-2 hover:opacity-80 transition-opacity">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back to Dashboard
              </button>
              <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface mb-2 font-headline tracking-tight">
                {testData?.title || 'Test Results'}
              </h1>
              <p className="text-on-surface-variant flex items-center gap-2 font-semibold text-sm">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                Analytics Snapshot
              </p>
            </div>
            
            {/* Quick Result Badge */}
            <div className={`px-6 py-4 rounded-2xl flex flex-col items-center justify-center border shadow-sm ${accScore >= 70 ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-yellow-50/50 border-yellow-200 text-yellow-800'}`}>
               <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Total Score</span>
               <span className="text-3xl font-black">{accScore}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Understanding Score Card */}
            <div className="bg-white rounded-3xl p-8 shadow-ambient border border-outline-variant/10 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              <div className="flex items-start justify-between relative z-10 mb-6">
                <div>
                  <h3 className="font-extrabold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">psychology</span>
                    Understanding
                  </h3>
                  <p className="text-xs font-bold text-outline uppercase tracking-wider mt-1">Cognitive Accuracy</p>
                </div>
              </div>
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-on-surface">{accScore}</span>
                  <span className="text-lg font-bold text-on-surface-variant mb-1">/ 100</span>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${accScore >= 80 ? 'bg-green-500' : (accScore >= 50 ? 'bg-yellow-500' : 'bg-red-500')}`}
                    style={{ width: `${accScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Engagement Score Card */}
            <div className="bg-gradient-to-br from-primary to-secondary rounded-3xl p-8 shadow-md relative overflow-hidden text-white group">
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
              <div className="flex items-start justify-between relative z-10 mb-6">
                <div>
                  <h3 className="font-extrabold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined">vital_signs</span>
                    Engagement Pulse
                  </h3>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider mt-1">Focus Flow Metric</p>
                </div>
              </div>
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black">{engScore}</span>
                  <span className="text-lg font-bold text-white/80 mb-1">/ 100</span>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-1000 ease-out delay-300"
                    style={{ width: `${engScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights & Weaknesses */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-outline-variant/10">
            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 font-headline">
              <span className="material-symbols-outlined text-secondary">auto_spark</span>
              Cognitive Insights
            </h3>
            
            {weakSpots.length > 0 ? (
              <div className="space-y-4">
                 <p className="text-on-surface-variant text-sm font-semibold mb-4">Focus Flow AI identified the following areas for improvement based on your response times and accuracy:</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {weakSpots.map((concept, idx) => (
                     <div key={idx} className="bg-error/5 border border-error/20 rounded-xl p-5 flex items-start gap-4">
                       <span className="material-symbols-outlined text-error mt-0.5">trending_down</span>
                       <div>
                         <h4 className="font-bold text-error mb-1 capitalize">{concept}</h4>
                         <p className="text-xs font-semibold text-on-surface-variant leading-relaxed">Consider reviewing core fundamentals of {concept}. Practicing this topic will increase your mastery.</p>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            ) : (
              <div className="bg-green-50/50 border border-green-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 flex-shrink-0">
                    <span className="material-symbols-outlined text-[24px]">emoji_events</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-green-800 text-lg mb-0.5">Perfect Cognitive Balance!</h4>
                    <p className="text-sm font-semibold text-green-700/80">You demonstrated strong understanding across all tested concepts.</p>
                  </div>
                </div>
                <button className="px-6 py-2 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 transition-colors shrink-0 text-sm">
                  Share Result
                </button>
              </div>
            )}
          </div>
          
        </section>

        {/* Right Column: Breakdown */}
        <aside className="lg:col-span-4 space-y-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="bg-white rounded-3xl p-8 shadow-ambient border border-outline-variant/10 sticky top-28">
            <h3 className="font-extrabold text-lg mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">pie_chart</span>
              Concept Mapping
            </h3>
            
            {Object.keys(concepts).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(concepts).map(([conceptName, performance], idx) => (
                  <div key={idx} className="space-y-2 group">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-on-surface capitalize truncate pr-4">{conceptName}</span>
                      <span className="text-xs font-extrabold text-on-surface-variant flex-shrink-0">{performance}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out group-hover:opacity-80
                          ${performance >= 75 ? 'bg-primary' : (performance >= 50 ? 'bg-secondary' : 'bg-error')}
                        `}
                        style={{ width: `${performance}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant font-semibold text-center italic py-4">No specific concepts mapped for this test.</p>
            )}
          </div>
        </aside>

      </main>
      
      {/* Decorative gradient background across the whole screen */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/40 via-surface to-purple-50/40" />

      <BottomNav variant="student" />
    </div>
  );
}
