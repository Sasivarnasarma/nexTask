import { User } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <nav className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white text-slate-800">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => onMenuClick?.()}
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="font-extrabold text-xl tracking-tight text-slate-900 md:hidden">
          nexTask
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-slate-600">Active</span>
        <Link
          to="/profile"
          title="Profile Settings"
          className="h-8 w-8 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center transition-colors"
        >
          <User size={16} />
        </Link>
      </div>
    </nav>
  );
}
