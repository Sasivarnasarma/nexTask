import { usePasswordStrength } from '@/hooks/usePasswordStrength';

interface Props {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className = '' }: Props) {
  const { rules, percentage, color, label, level } = usePasswordStrength(password);

  if (!password) return null;

  return (
    <div className={`mt-3 space-y-2 ${className}`}>
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
        {label && (
          <span
            className="text-xs font-semibold w-12 text-right transition-colors duration-300"
            style={{ color }}
          >
            {label}
          </span>
        )}
      </div>

      {/* Rule checklist */}
      <ul className="space-y-1.5">
        {rules.map((rule) => (
          <li key={rule.id} className="flex items-center gap-2">
            {/* Indicator dot / checkmark */}
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0 transition-colors duration-200"
              style={{ backgroundColor: rule.met ? '#22c55e' : '#3f3f46' }}
            >
              {rule.met ? (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M1.5 4L3 5.5L6.5 2"
                    stroke="white"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 block" />
              )}
            </span>
            <span
              className={`text-xs transition-colors duration-200 ${
                rule.met ? 'text-zinc-400 line-through decoration-zinc-600' : 'text-zinc-500'
              }`}
            >
              {rule.label}
            </span>
          </li>
        ))}
      </ul>

      {/* Hidden from layout – accessibility live region */}
      <div aria-live="polite" className="sr-only">
        Password strength: {level}. {rules.filter((r) => !r.met).length} requirements remaining.
      </div>
    </div>
  );
}
