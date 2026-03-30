/**
 * Skeleton — animated loading placeholder.
 * Drop-in replacement for content blocks while data is fetching.
 *
 * Props:
 *  - className {string} Tailwind classes for sizing/shape (e.g. "h-8 w-32")
 */
export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-surface-container-high animate-pulse rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}
