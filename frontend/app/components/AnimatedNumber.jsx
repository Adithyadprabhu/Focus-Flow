'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * AnimatedNumber — smoothly animates a numeric value using
 * cubic ease-out via requestAnimationFrame. Safe to unmount mid-animation.
 *
 * Props:
 *  - value   {number} Target value to animate toward
 *  - suffix  {string} Appended string (e.g. "%")
 *  - duration {number} Animation duration in ms (default 600)
 */
export default function AnimatedNumber({ value, suffix = '', duration = 600 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef({ from: 0, startTime: null });

  useEffect(() => {
    const to = Number(value) || 0;
    startRef.current = { from: display, startTime: null };

    const tick = (now) => {
      if (!startRef.current.startTime) startRef.current.startTime = now;
      const elapsed = now - startRef.current.startTime;
      const t = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startRef.current.from + (to - startRef.current.from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span>{display}{suffix}</span>;
}
