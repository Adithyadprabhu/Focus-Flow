'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from './components/AppHeader';

import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get, child, serverTimestamp } from 'firebase/database';

export default function AuthPage() {
  const router = useRouter();
  const [authView, setAuthView] = useState('login'); // 'splash' | 'login' | 'register'
  const [selectedRole, setSelectedRole] = useState('student'); // 'student' | 'teacher'
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Firebase Login Implementation
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const email = e.target['auth-email'].value;
    const password = e.target['auth-pass'].value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Read their role securely from Realtime Database
      const dbRef = ref(db);
      const userSnap = await get(child(dbRef, `users/${userCredential.user.uid}`));
      
      if (userSnap.exists()) {
        const role = userSnap.val().role;
        router.push(role === 'student' ? '/student' : '/teacher');
      } else {
        router.push('/student'); // Fallback safe route
      }
    } catch (err) {
      setErrorMsg(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  // 2. Firebase Registration Implementation
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const name = e.target['reg-name'].value;
    const email = e.target['reg-email'].value;
    const password = e.target['reg-pass'].value;
    const confirmPassword = e.target['reg-conf-pass'].value;

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Create user auth identity natively in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Save detailed profile to the "users" RTDB tree matching the Backend Spec
      await set(ref(db, `users/${userCredential.user.uid}`), {
        uid: userCredential.user.uid,
        name,
        email,
        role: selectedRole,
        institution: "Fluid Academy", // simplified default
        createdAt: serverTimestamp()
      });

      router.push(selectedRole === 'student' ? '/student' : '/teacher');
    } catch (err) {
      setErrorMsg(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body text-on-surface">
      <AppHeader variant="login" />

      {authView === 'splash' && (
        <main className="flex-grow flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Visual Side */}
            <div className="hidden lg:flex flex-col gap-8 pr-12">
              <div className="space-y-4">
                <span className="inline-block px-4 py-1.5 rounded-full bg-secondary-container/10 text-secondary font-bold text-xs tracking-widest uppercase">
                  Cognitive Sanctuary
                </span>
                <h1 className="font-headline text-6xl font-extrabold text-on-surface leading-[1.1] tracking-tight">
                  Understand Your Class in{' '}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Real-Time.
                  </span>
                </h1>
                <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">
                  Experience a focused study environment designed to harmonize academic rigor with fluid digital interaction.
                </p>
              </div>
              <div className="relative h-80 w-full rounded-xl overflow-hidden shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Collaborative learning"
                  className="absolute inset-0 w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" aria-hidden="true" />
                <div className="absolute bottom-6 left-6 right-6 p-6 rounded-lg bg-white/70 backdrop-blur-xl border border-white/40">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white">
                      <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">AI-Powered Insights</p>
                      <p className="text-xs text-on-surface-variant">Real-time engagement tracking active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interaction Side */}
            <div className="flex flex-col gap-10">
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-bold text-on-surface">Choose your path</h2>
                <p className="text-on-surface-variant">Select your role to personalize your sanctuary experience.</p>
              </div>

              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-6" role="group" aria-label="Choose your role">
                {[
                  { role: 'student', icon: 'person', label: 'Student', sub: 'Join classes & learn', iconColor: 'text-primary' },
                  { role: 'teacher', icon: 'school', label: 'Teacher', sub: 'Manage & guide', iconColor: 'text-secondary' },
                ].map(({ role, icon, label, sub, iconColor }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role);
                      setAuthView('register');
                    }}
                    className={`group w-full flex flex-col items-center p-8 rounded-xl border-2 transition-all duration-300 text-center gap-4
                      ${selectedRole === role
                        ? 'border-primary bg-white scale-[1.02] shadow-lg shadow-primary/10'
                        : 'bg-surface-container-low hover:bg-surface-container-lowest border-transparent hover:border-primary-fixed'}`}
                  >
                    <div className={`h-20 w-20 rounded-full bg-white shadow-sm flex items-center justify-center ${iconColor} group-hover:scale-110 transition-transform duration-500`}>
                      <span className="material-symbols-outlined text-4xl fill-icon" aria-hidden="true">{icon}</span>
                    </div>
                    <div>
                      <span className="block font-headline font-bold text-lg">{label}</span>
                      <span className="text-xs text-on-surface-variant">{sub}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                <button
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Sign In to Your Account
                </button>
              </div>
              
              <p className="text-center text-sm text-on-surface-variant">
                New to the academy?{' '}
                <button type="button" onClick={() => setAuthView('register')} className="text-primary font-bold hover:underline">
                  Request access
                </button>
              </p>
            </div>
          </div>
        </main>
      )}

      {/* Dedicated Login View */}
      {authView === 'login' && (
        <main className="flex-grow flex justify-center items-center p-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-surface to-surface">
          <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" aria-hidden="true" />
          
          <div className="w-full max-w-md p-8 md:p-12 rounded-[2rem] shadow-ambient bg-white/70 backdrop-blur-3xl border border-white/60 z-10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-10">
            <div className="text-center mb-10">
              <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">Welcome Back</h1>
              <p className="text-on-surface-variant font-medium">Continue your cognitive journey</p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container text-sm font-medium border border-error/20 flex items-center gap-2">
                 <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
                 {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="auth-email" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" aria-hidden="true">mail</span>
                  <input id="auth-email" required className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline outline-none" placeholder="alex@university.edu" type="email" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="auth-pass" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Password</label>
                  <a href="#" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wide">Forgot?</a>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" aria-hidden="true">lock</span>
                  <input id="auth-pass" required className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline outline-none" placeholder="••••••••" type="password" />
                </div>
              </div>

              <div className="pt-4">
                <button disabled={loading} type="submit" className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-lg tracking-wide disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2">
                  {loading ? <span className="material-symbols-outlined animate-spin" aria-hidden="true">progress_activity</span> : null}
                  Sign In
                </button>
              </div>
            </form>

            <div className="mt-8 text-center border-t border-outline-variant/20 pt-8">
              <p className="text-on-surface-variant text-sm font-medium">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => {setErrorMsg(''); setAuthView('register');}} className="text-primary font-bold hover:underline">
                  Create one
                </button>
              </p>
              <button type="button" onClick={() => setAuthView('splash')} className="block mx-auto mt-4 text-xs text-on-surface-variant hover:text-primary transition-colors">
                View platform roles
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Registration View */}
      {authView === 'register' && (
        <main className="flex-grow flex justify-center items-center p-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-surface to-surface">
          <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" aria-hidden="true" />
          <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" aria-hidden="true" />
          
          <div className="w-full max-w-2xl p-8 md:p-12 rounded-[2rem] shadow-ambient bg-white/70 backdrop-blur-3xl border border-white/60 z-10 transition-all duration-500 animate-in fade-in slide-in-from-bottom-10">
            <div className="text-center mb-10">
              <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">Create Your Account</h1>
              <p className="text-on-surface-variant font-medium">Start your smart learning journey today</p>
            </div>

            {errorMsg && (
              <div className="mb-6 mx-auto max-w-sm p-4 rounded-xl bg-error-container text-on-error-container text-sm font-medium border border-error/20 flex items-center gap-2">
                 <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
                 {errorMsg}
              </div>
            )}

            {/* Role Tab Toggle */}
            <div className="flex p-1.5 bg-surface-container border border-outline-variant/10 rounded-full mb-8 max-w-xs mx-auto shadow-inner" role="group" aria-label="Select role">
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={`flex-1 py-2.5 px-6 rounded-full text-sm font-bold transition-all ${
                  selectedRole === 'student' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('teacher')}
                className={`flex-1 py-2.5 px-6 rounded-full text-sm font-bold transition-all ${
                  selectedRole === 'teacher' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Teacher
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              {/* Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Full Name</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" aria-hidden="true">person</span>
                    <input id="reg-name" required className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline outline-none" placeholder="Alex Johnson" type="text" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-email" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Email Address</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" aria-hidden="true">mail</span>
                    <input id="reg-email" required className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline outline-none" placeholder="alex@university.edu" type="email" />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="reg-pass" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" aria-hidden="true">lock</span>
                    <input id="reg-pass" required minLength={6} className="w-full pl-12 pr-12 py-3.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline outline-none" placeholder="••••••••" type="password" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-conf-pass" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant px-1">Confirm Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" aria-hidden="true">lock_reset</span>
                    <input id="reg-conf-pass" required className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline outline-none" placeholder="••••••••" type="password" />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button disabled={loading} type="submit" className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-lg tracking-wide disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2">
                  {loading ? <span className="material-symbols-outlined animate-spin" aria-hidden="true">progress_activity</span> : null}
                  Create Account
                </button>
              </div>
            </form>

            <div className="mt-8 text-center border-t border-outline-variant/20 pt-8">
              <p className="text-on-surface-variant text-sm font-medium">
                Already have an account?{' '}
                <button type="button" onClick={() => { setErrorMsg(''); setAuthView('login'); }} className="text-primary font-bold hover:underline">
                  Sign In here
                </button>
              </p>
            </div>
          </div>
        </main>
      )}

      {/* Shared Footer */}
      {authView === 'splash' && (
        <footer className="p-8 text-center text-on-surface-variant text-xs font-medium opacity-60">
          © 2024 The Fluid Academy. All rights reserved. Built for Cognitive Clarity.
        </footer>
      )}
    </div>
  );
}
