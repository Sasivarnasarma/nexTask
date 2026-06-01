import { Link, useLocation } from 'react-router-dom';

export function Sidebar({ isOpen }: { isOpen: boolean }) {
  const location = useLocation();

  // Helper to determine if a route is currently active
  const isActive = (path: string) => location.pathname.includes(path);

  return (
    <aside className="w-full border-r border-slate-200 min-h-screen py-6 bg-slate-50 flex flex-col justify-between transition-all duration-300">
      <div className="flex flex-col gap-8">
        <div
          className={`font-extrabold tracking-tight text-slate-900 transition-all duration-300 ${isOpen ? 'text-2xl px-6' : 'text-xl text-center'}`}
        >
          {isOpen ? 'nexTask' : 'T'}
        </div>

        <div className="flex flex-col gap-2 px-3">
          {isOpen && (
            <div className="text-slate-400 font-semibold text-[10px] tracking-widest uppercase mb-1 px-3">
              Main Menu
            </div>
          )}

          <Link
            to="/dashboard"
            title="Dashboard"
            className={`flex items-center ${isOpen ? 'px-3 py-2 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${isActive('/dashboard') ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'} rounded-lg text-sm transition-colors`}
          >
            {isOpen ? 'Dashboard' : 'D'}
          </Link>
        </div>

        <div className="flex flex-col gap-2 px-3">
          {isOpen && (
            <div className="text-slate-400 font-semibold text-[10px] tracking-widest uppercase mb-1 px-3 mt-4">
              General
            </div>
          )}

          <Link
            to="/settings"
            title="Settings"
            className={`flex items-center ${isOpen ? 'px-3 py-2 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${isActive('/settings') ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'} rounded-lg text-sm transition-colors`}
          >
            {isOpen ? 'Settings' : 'S'}
          </Link>
        </div>
      </div>

      <div className="px-3">
        <button
          onClick={() => window.location.reload()}
          title="Log Out"
          className={`flex w-full items-center ${isOpen ? 'px-3 py-2 justify-start' : 'h-10 w-10 justify-center mx-auto'} text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg font-bold text-sm transition-colors`}
        >
          {isOpen ? 'Log Out' : 'L'}
        </button>
      </div>
    </aside>
  );
}
