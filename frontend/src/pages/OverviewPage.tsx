import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import {
  Users,
  CheckCircle2,
  Mail,
  MessageSquare,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const OverviewPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => apiFetch<any>('/analytics/overview'),
  });

  const metrics = data?.metrics || {
    totalLeads: 0,
    eligibleLeads: 0,
    draftsGenerated: 0,
    messagesApproved: 0,
    emailsSent: 0,
    whatsappSent: 0,
    repliesReceived: 0,
    positiveReplies: 0,
    optOuts: 0,
  };

  const statCards = [
    { label: 'Total Leads', val: metrics.totalLeads, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Eligible (Consent)', val: metrics.eligibleLeads, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'AI Drafts Ready', val: metrics.draftsGenerated, icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Approved Messages', val: metrics.messagesApproved, icon: CheckCircle2, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { label: 'Emails Sent', val: metrics.emailsSent, icon: Mail, color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { label: 'WhatsApp Sent', val: metrics.whatsappSent, icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Replies Received', val: metrics.repliesReceived, icon: MessageCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Positive Leads', val: metrics.positiveReplies, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-900/40 border border-indigo-500/20 shadow-xl backdrop-blur-sm">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
            AI Client Outreach Pro v1.0
          </span>
          <h2 className="text-2xl font-bold text-white">Agency Outreach Command Center</h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Automating business acquisition for Website Development & Android Application Development using 100% Free OpenRouter & Ollama AI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/approval-queue"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            Review Queue
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            to="/ai-generator"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Generate Messages
          </Link>
        </div>
      </div>

      {/* 8 Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {isLoading ? '...' : c.val}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${c.bg} ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Send Volume */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Outreach Dispatch Timeline</h4>
              <p className="text-xs text-slate-500">Daily messages sent across Email & WhatsApp</p>
            </div>
            <span className="text-xs font-medium text-slate-400">Past 7 Days</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.timeline || []}>
                <defs>
                  <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="emails" stroke="#6366f1" fillOpacity={1} fill="url(#emailGrad)" name="Emails Sent" />
                <Area type="monotone" dataKey="whatsapp" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="WhatsApp Sent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Interest Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Services in Demand</h4>
          <p className="text-xs text-slate-500 mb-2">Lead breakdown by requested capabilities</p>

          <div className="h-48 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.serviceDistribution || [{ name: 'Web Dev', value: 3 }, { name: 'Android', value: 2 }]}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(data?.serviceDistribution || [1, 2]).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1">
            {(data?.serviceDistribution || []).slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {item.name}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Recent Automation Activity</h4>
          <Link to="/activity-logs" className="text-xs font-semibold text-indigo-500 hover:underline">
            View All Logs &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5">Action</th>
                <th className="py-2.5">Entity</th>
                <th className="py-2.5">Operator</th>
                <th className="py-2.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {(data?.recentActivity || []).slice(0, 5).map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 font-medium text-slate-900 dark:text-slate-200">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{log.entityType}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{log.user}</td>
                  <td className="py-3 text-right text-xs text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
