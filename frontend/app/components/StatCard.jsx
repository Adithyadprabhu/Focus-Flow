import React from 'react';

/**
 * StatCard — metric display card with icon, label, value, and optional progress bar.
 *
 * Props:
 *  - icon: string  (Material Symbol name)
 *  - label: string
 *  - value: string  (e.g. "94%")
 *  - barPercent?: number  (0–100, renders a progress bar if provided)
 *  - barColor?: string  (Tailwind color class, e.g. "bg-primary")
 *  - badge?: string  (small pill label)
 *  - badgeBg?: string  (Tailwind bg+text classes for badge)
 *  - iconBg?: string  (Tailwind classes for icon container)
 */
const StatCard = React.memo(({
  icon,
  label,
  value,
  barPercent,
  barColor = 'bg-primary',
  badge,
  badgeBg = 'bg-surface-container text-on-surface-variant',
  iconBg = 'bg-primary/10 text-primary',
}) => {
  return (
    <div className="bg-surface-container-lowest p-8 rounded-xl shadow-ambient relative overflow-hidden group border border-outline-variant/10">
      {/* Decorative icon */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
        <span className="material-symbols-outlined text-6xl">{icon}</span>
      </div>

      {/* Badge (optional) */}
      {badge && (
        <div className="flex justify-end mb-2">
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${badgeBg}`}>{badge}</span>
        </div>
      )}

      {/* Icon block (used in teacher metrics) */}
      {iconBg && !barPercent && badge !== undefined && (
        <div className={`p-3 rounded-lg w-fit mb-4 ${iconBg}`}>
          <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
        </div>
      )}

      <div className="relative z-10">
        <p className="text-on-surface-variant font-medium mb-1 text-sm">{label}</p>
        <h3 className="text-4xl font-black text-on-surface">{value}</h3>

        {/* Progress bar (optional) */}
        {barPercent !== undefined && (
          <div className="mt-4 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-700`}
              style={{ width: `${barPercent}%` }}
              role="progressbar"
              aria-valuenow={barPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
