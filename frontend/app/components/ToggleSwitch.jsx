'use client';

/**
 * ToggleSwitch — accessible ARIA switch toggle button.
 *
 * Props:
 *  - checked: boolean
 *  - onChange: () => void
 *  - label: string  (visible label text)
 *  - id?: string
 *  - size?: 'sm' | 'md'  (default 'md')
 */
export default function ToggleSwitch({ checked, onChange, label, id, size = 'md' }) {
  const trackW = size === 'sm' ? 'w-10 h-5' : 'w-11 h-6';
  const thumbW = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const thumbTranslate = size === 'sm' ? 'translate-x-5' : 'translate-x-5';

  return (
    <div className="flex items-center justify-between py-2">
      {label && (
        <label htmlFor={id} className="text-sm font-medium cursor-pointer select-none">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative ${trackW} rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-outline-variant/50'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 ${thumbW} bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? thumbTranslate : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
