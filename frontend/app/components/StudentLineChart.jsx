import React from 'react';

/**
 * StudentLineChart — single-series SVG area+line chart.
 * Used on the student dashboard to display accuracy over time.
 *
 * Props:
 *  - data   {Array<{ label: string, value: number }>} Data points
 *  - color  {string} Stroke/fill colour (hex or CSS value), default primary blue
 *  - height {number} SVG height in px, default 120
 */
const StudentLineChart = React.memo(({ data, color = '#3525cd', height = 120 }) => {
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

  const toCoord = (d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.value - min) / range) * (h - pad * 2);
    return { x, y };
  };

  const coords = data.map((d, i) => toCoord(d, i));
  const polyline = coords.map(({ x, y }) => `${x},${y}`).join(' ');

  const areaPath = [
    `M ${coords[0].x},${coords[0].y}`,
    ...coords.slice(1).map(({ x, y }) => `L ${x},${y}`),
    `L ${coords[coords.length - 1].x},${h - pad}`,
    `L ${coords[0].x},${h - pad}`,
    'Z',
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="student-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#student-chart-fill)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map(({ x, y }, i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="white" stroke={color} strokeWidth="2.5" />
      ))}
    </svg>
  );
});

StudentLineChart.displayName = 'StudentLineChart';

export default StudentLineChart;
