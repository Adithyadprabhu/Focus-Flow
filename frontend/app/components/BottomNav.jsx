'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * BottomNav — fixed mobile-only bottom navigation bar.
 * Props:
 *  - variant: 'student' | 'teacher' | 'test'
 */
export default function BottomNav({ variant }) {
  const pathname = usePathname();

  const configs = {
    student: [
      { icon: 'home', label: 'Home', href: '/student' },
      { icon: 'menu_book', label: 'Tests', href: '/test' },
      { icon: 'history', label: 'Results', href: '/student/results' },
      { icon: 'person', label: 'Profile', href: '/student' },
    ],
    teacher: [
      { icon: 'home', label: 'Home', href: '/teacher' },
      { icon: 'quiz', label: 'Tests', href: '/teacher/tests' },
      { icon: 'group', label: 'Students', href: '/teacher/students' },
      { icon: 'add_circle', label: 'Create', href: '/teacher/create-test' },
    ],
    test: [
      { icon: 'grid_view', label: 'Overview', href: '/test' },
      { icon: 'menu_book', label: 'Test', href: '#' },
      { icon: 'history', label: 'Results', href: '/student/results' },
      { icon: 'home', label: 'Home', href: '/student' },
    ],
  };

  const items = configs[variant] ?? configs.student;

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 pb-6 pt-3 bg-white/90 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(53,37,205,0.08)] border-t border-outline-variant/10"
    >
      {items.map(({ icon, label, href }) => {
        const isActive = pathname === href || (href !== '/student' && href !== '/teacher' && href !== '#' && pathname?.startsWith(href));
        return (
          <Link
            key={icon + label}
            href={href}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={
              isActive
                ? 'flex flex-col items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-2xl px-4 py-2 shadow-lg transition-all active:scale-90'
                : 'flex flex-col items-center justify-center text-on-surface-variant p-2 hover:text-primary transition-all'
            }
          >
            <span className={`material-symbols-outlined text-2xl${isActive ? ' fill-icon' : ''}`} aria-hidden="true">
              {icon}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
