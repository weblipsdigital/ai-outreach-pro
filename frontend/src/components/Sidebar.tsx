import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Sparkles,
  Mail,
  MessageSquare,
  CheckSquare,
  Clock,
  Inbox,
  BarChart3,
  Sliders,
  KeyRound,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Leads', to: '/leads', icon: Users },
    { label: 'Google Sheets', to: '/sheets', icon: FileSpreadsheet },
    { label: 'AI Message Generator', to: '/ai-generator', icon: Sparkles },
    { label: 'Email Campaigns', to: '/email-campaigns', icon: Mail },
    { label: 'WhatsApp Campaigns', to: '/whatsapp-campaigns', icon: MessageSquare },
    { label: 'Approval Queue', to: '/approval-queue', icon: CheckSquare },
    { label: 'Follow-ups', to: '/follow-ups', icon: Clock },
    { label: 'Inbox', to: '/inbox', icon: Inbox },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
    { label: 'Automation Settings', to: '/automation-settings', icon: Sliders },
    { label: 'API Integrations', to: '/integrations', icon: KeyRound },
    { label: 'Activity Logs', to: '/activity-logs', icon: FileText },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-30 flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide leading-tight">AI Outreach</h1>
              <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Web & App Agency</span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
        )}

        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Compliance & Safety Status Badge */}
      <div className="p-3 border-t border-slate-800">
        <div
          className={`flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {!collapsed && (
            <div className="truncate">
              <p className="text-slate-300 font-medium">Compliance Active</p>
              <p className="text-[10px] text-slate-500">Opt-in & Rate Rails Safe</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
