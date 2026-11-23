import React from 'react';
import { useTheme } from '../contexts/ThemeContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import { Sun, Moon, LogOut, ShieldAlert, Cpu } from 'lucide-react';

interface HeaderProps {
  collapsed: boolean;
  dryRunActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ collapsed, dryRunActive = true }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-20 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300 ${
        collapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Left: Status Badges */}
      <div className="flex items-center gap-3">
        {dryRunActive ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>DRY-RUN MODE (Zero Cost Safe)</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE DISPATCH ENABLED</span>
          </div>
        )}

        <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
          <span>OpenRouter Free AI</span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Dark/Light toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="hidden md:block text-right">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{user?.email || 'admin@local'}</p>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
