// Student dashboard static data

export const studentStats = [
  {
    id: 'participation',
    icon: 'rocket_launch',
    label: 'Participation %',
    value: '94%',
    barPercent: 94,
    barColor: 'bg-primary',
  },
  {
    id: 'accuracy',
    icon: 'target',
    label: 'Accuracy %',
    value: '88%',
    barPercent: 88,
    barColor: 'bg-secondary',
  },
  {
    id: 'completion',
    icon: 'check_circle',
    label: 'Completion Rate',
    value: '72%',
    barPercent: 72,
    barColor: 'bg-tertiary-container',
  },
];

export const weeklyAccuracy = [
  { day: 'Mon', value: 60 },
  { day: 'Tue', value: 45 },
  { day: 'Wed', value: 80 },
  { day: 'Thu', value: 65 },
  { day: 'Fri', value: 90 },
  { day: 'Sat', value: 75 },
];

export const conceptProficiency = [
  { id: 'linear-algebra', label: 'Linear Algebra', status: 'STRONG', statusBg: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  { id: 'differentiation', label: 'Differentiation', status: 'MODERATE', statusBg: 'bg-amber-100 text-amber-700' },
  { id: 'vector-spaces', label: 'Vector Spaces', status: 'WEAK', statusBg: 'bg-error-container text-on-error-container' },
];

export const learningPath = [
  {
    id: 'complex-variables',
    phase: 'Current',
    phaseColor: 'text-primary',
    lineColor: 'bg-primary',
    title: 'Complex Variables Lab',
    due: 'Due tomorrow, 5:00 PM',
  },
  {
    id: 'quantum-mechanics',
    phase: 'Upcoming',
    phaseColor: 'text-on-surface-variant',
    lineColor: 'bg-outline-variant',
    title: 'Quantum Mechanics Intro',
    due: 'Oct 24 • 10:30 AM',
  },
  {
    id: 'thermodynamics',
    phase: 'Upcoming',
    phaseColor: 'text-on-surface-variant',
    lineColor: 'bg-outline-variant',
    title: 'Thermodynamics Quiz',
    due: 'Oct 26 • 2:00 PM',
  },
];
