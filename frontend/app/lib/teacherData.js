// Teacher dashboard static data

export const teacherMetrics = [
  {
    id: 'engagement',
    icon: 'bolt',
    label: 'Engagement %',
    value: '88.4%',
    badge: '+12%',
    badgeBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    iconBg: 'bg-primary-fixed text-primary',
  },
  {
    id: 'understanding',
    icon: 'psychology',
    label: 'Understanding %',
    value: '74.2%',
    badge: '-2%',
    badgeBg: 'bg-error-container text-on-error-container',
    iconBg: 'bg-secondary-fixed text-secondary',
  },
  {
    id: 'needing-help',
    icon: 'warning',
    label: 'Needing Help',
    value: '06',
    badge: null,
    badgeBg: '',
    iconBg: 'bg-error-container/30 text-error',
  },
  {
    id: 'active-participants',
    icon: 'group',
    label: 'Active Participants',
    value: '32/34',
    badge: 'LIVE',
    badgeBg: 'bg-surface-container-high text-on-surface-variant',
    iconBg: 'bg-surface-container text-on-surface',
  },
];

export const conceptAccuracy = [
  { id: 'calculus', label: 'Calculus Basics', val: 92, color: 'bg-primary', textColor: 'text-primary' },
  { id: 'integration', label: 'Integration Laws', val: 64, color: 'bg-secondary', textColor: 'text-secondary' },
  { id: 'chain-rule', label: 'Chain Rule', val: 38, color: 'bg-error', textColor: 'text-error' },
  { id: 'limits', label: 'Limits & Continuity', val: 81, color: 'bg-primary', textColor: 'text-primary' },
];

export const classStudents = [
  {
    id: 'jordan-smith',
    name: 'Jordan Smith',
    studentId: '#49281',
    score: 94,
    engagement: 95,
    engagementLabel: 'High',
    engagementColor: 'bg-tertiary-fixed-dim',
    labelColor: 'text-tertiary',
    status: 'Excelling',
    statusBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    lastActive: '2 mins ago',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80',
  },
  {
    id: 'mia-wong',
    name: 'Mia Wong',
    studentId: '#49282',
    score: 61,
    engagement: 45,
    engagementLabel: 'Low',
    engagementColor: 'bg-error',
    labelColor: 'text-error',
    status: 'At Risk',
    statusBg: 'bg-error-container text-on-error-container',
    lastActive: 'Active Now',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
  },
  {
    id: 'liam-brown',
    name: 'Liam Brown',
    studentId: '#49283',
    score: 78,
    engagement: 70,
    engagementLabel: 'Avg',
    engagementColor: 'bg-primary',
    labelColor: 'text-primary',
    status: 'Stable',
    statusBg: 'bg-primary-fixed text-on-primary-fixed',
    lastActive: '15 mins ago',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80',
  },
];

export const timeLabels = ['08:00 AM', '08:15 AM', '08:30 AM', '08:45 AM', '09:00 AM'];
