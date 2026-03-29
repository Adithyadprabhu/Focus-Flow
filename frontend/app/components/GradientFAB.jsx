'use client';
import Link from 'next/link';

/**
 * GradientFAB — fixed floating action button with optional tooltip.
 *
 * Props:
 *  - href?: string   (if provided, wraps in a Link)
 *  - icon: string    (Material Symbol name)
 *  - label: string   (aria-label + tooltip text)
 *  - onClick?: () => void
 */
export default function GradientFAB({ href, icon, label, onClick }) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-24 lg:bottom-10 right-8 w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-90 transition-all z-[60] group"
    >
      <span
        className="material-symbols-outlined text-3xl group-hover:rotate-12 transition-transform fill-icon"
        aria-hidden="true"
      >
        {icon}
      </span>
      {/* Tooltip */}
      <div className="absolute -top-12 right-0 bg-white text-primary px-4 py-2 rounded-xl text-xs font-bold shadow-lg border border-primary/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {label}
      </div>
    </button>
  );

  if (href) {
    return <Link href={href} aria-label={label}>{btn}</Link>;
  }
  return btn;
}
