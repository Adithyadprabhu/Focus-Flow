'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../../lib/firebase';

/**
 * AppHeader — shared sticky navigation with live auth + profile dropdown.
 * Props:
 *  - variant: 'login' | 'student' | 'teacher'
 */
export default function AppHeader({ variant = 'login' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ── Auth listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // ── Fetch user profile from RTDB ──
  useEffect(() => {
    if (!user) { setUserData(null); return; }
    const userRef = ref(db, `users/${user.uid}`);
    const unsub = onValue(userRef, (snap) => {
      setUserData(snap.exists() ? snap.val() : null);
    });
    return () => unsub();
  }, [user]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut(auth);
    router.push('/');
  };

  const displayName = userData?.name || user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const email = userData?.email || user?.email || '';
  const role = userData?.role || variant;

  // ── Nav links per variant ──
  const navLinks = {
    student: [
      { label: 'Dashboard', href: '/student' },
      { label: 'Tests', href: '/test' },
      { label: 'Results', href: '/student/results' },
    ],
    teacher: [
      { label: 'Dashboard', href: '/teacher' },
      { label: 'Tests', href: '/teacher/tests' },
      { label: 'Students', href: '/teacher/students' },
    ],
  };

  const links = navLinks[variant] ?? [];

  return (
    <header className="bg-white/80 backdrop-blur-xl top-0 sticky z-50 flex justify-between items-center px-6 md:px-8 py-4 w-full border-b border-outline-variant/10 shadow-sm">
      {/* Logo */}
      <Link href={variant === 'teacher' ? '/teacher' : variant === 'student' ? '/student' : '/'} className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <span className="material-symbols-outlined text-primary text-2xl fill-icon" aria-hidden="true">bubble_chart</span>
        </div>
        <span className="text-xl font-black bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent font-headline tracking-tight hidden sm:block">
          Focus-Flow
        </span>
      </Link>

      {/* Center nav */}
      {links.length > 0 && (
        <nav className="hidden md:flex gap-1" aria-label="Primary navigation">
          {links.map(({ label, href }) => {
            const isActive = pathname === href || (href !== '/student' && href !== '/teacher' && pathname?.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Right: Profile dropdown or login CTA */}
      {variant === 'login' ? (
        <button
          type="button"
          aria-label="Toggle dark mode"
          className="p-3 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant"
        >
          <span className="material-symbols-outlined" aria-hidden="true">dark_mode</span>
        </button>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-label="Open profile menu"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-full hover:bg-surface-container transition-colors"
          >
            {/* Name (desktop) */}
            <span className="hidden sm:block text-sm font-bold text-on-surface max-w-[120px] truncate">{displayName}</span>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black text-sm flex-shrink-0 select-none">
              {initials}
            </div>
            <span className={`material-symbols-outlined text-on-surface-variant text-sm transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {/* Dropdown */}
          <div
            className={`absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden transition-all duration-200 origin-top-right ${
              dropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
            }`}
            role="menu"
          >
            {/* User info */}
            <div className="px-5 py-4 border-b border-outline-variant/10 bg-surface-container-lowest">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-on-surface truncate">{displayName}</p>
                  <p className="text-xs text-on-surface-variant truncate">{email}</p>
                  <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                    role === 'teacher' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                  }`}>
                    {role}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-2">
              <Link
                href={variant === 'teacher' ? '/teacher' : '/student'}
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors w-full"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-xl">dashboard</span>
                Dashboard
              </Link>
              <Link
                href={variant === 'teacher' ? '/teacher/tests' : '/student/results'}
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors w-full"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-xl">{variant === 'teacher' ? 'quiz' : 'history'}</span>
                {variant === 'teacher' ? 'My Tests' : 'My Results'}
              </Link>

              <div className="my-1 mx-4 border-t border-outline-variant/20" />

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-error hover:bg-error-container/20 transition-colors w-full"
              >
                <span className="material-symbols-outlined text-error text-xl">logout</span>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
