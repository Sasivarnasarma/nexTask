import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useWebPush } from '@/hooks/useWebPush';
import { useAuthStore } from '@/store/auth.store';

export function Sidebar({ isOpen }: { isOpen: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { unsubscribe } = useWebPush();

  const isActive = (path: string) => location.pathname.includes(path);

  const handleLogout = async () => {
    try {
      await unsubscribe();
    } catch (e) {
      console.error('Failed to unsubscribe push notifications on logout:', e);
    }
    logout();
    navigate('/login');
  };

  return (
    // Changed bg-slate-50 to bg-background and border-slate-200 to border-border
    <aside className="w-full border-r border-border h-full py-6 bg-background flex flex-col justify-between transition-all duration-300">
      <div className="flex flex-col gap-8">
        <div
          // Changed text-slate-900 to text-foreground
          className={`font-extrabold tracking-tight text-foreground transition-all duration-300 ${isOpen ? 'text-2xl px-6' : 'text-xl text-center'}`}
        >
          {isOpen ? 'nexTask' : 'T'}
        </div>

        <div className="flex flex-col gap-6 px-3">
          <div className="flex flex-col gap-1.5">
            {isOpen && (
              // Changed text-slate-400 to text-muted-foreground
              <div className="text-muted-foreground font-bold text-[10px] tracking-widest uppercase mb-1.5 px-3">
                Main Menu
              </div>
            )}
            <Link
              to="/dashboard"
              title="Dashboard"
              className={`flex items-center gap-3 ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${
                isActive('/dashboard')
                  ? // Changed hardcoded indigo to theme primary colors
                    'bg-primary/10 text-primary font-bold shadow-sm'
                  : // Changed hover:bg-slate-100 to hover:bg-accent and text-slate-950 to text-accent-foreground
                    'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              } rounded-lg text-sm transition-all duration-200`}
            >
              <LayoutDashboard
                className={`w-5 h-5 shrink-0 ${isActive('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}
              />
              {isOpen && <span>Dashboard</span>}
            </Link>
          </div>

          <div className="flex flex-col gap-1.5">
            {isOpen && (
              <div className="text-muted-foreground font-bold text-[10px] tracking-widest uppercase mb-1.5 px-3">
                General
              </div>
            )}
            <Link
              to="/settings"
              title="Settings"
              className={`flex items-center gap-3 ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} ${
                isActive('/settings')
                  ? 'bg-primary/10 text-primary font-bold shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              } rounded-lg text-sm transition-all duration-200`}
            >
              <Settings
                className={`w-5 h-5 shrink-0 ${isActive('/settings') ? 'text-primary' : 'text-muted-foreground'}`}
              />
              {isOpen && <span>Settings</span>}
            </Link>
          </div>
        </div>
      </div>

      <div className="px-3">
        <button
          onClick={handleLogout}
          title="Log Out"
          // Changed red hover states to use the theme's destructive color
          className={`group flex items-center gap-3 w-full ${isOpen ? 'px-4 py-2.5 justify-start' : 'h-10 w-10 justify-center mx-auto'} text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg font-bold text-sm transition-all duration-200`}
        >
          <LogOut className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-destructive" />
          {isOpen && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}
