import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Mail,
  MessageSquare,
  Users,
  CheckCircle,
  AlertOctagon,
  Calendar,
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const AnalyticsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => apiFetch<any>('/analytics/overview'),
  });

  const metrics = data?.metrics || {};

  const funnelData = [
    { name: 'Total Leads', count: metrics.totalLeads || 0 },
    { name: 'Eligible (Consent)', count: metrics.eligibleLeads || 0 },
    { name: 'Drafts Created', count: metrics.draftsGenerated || 0 },
    { name: 'Messages Approved', count: metrics.messagesApproved || 0 },
    { name: 'Sent (Email+WA)', count: (metrics.emailsSent || 0) + (metrics.whatsappSent || 0) },
    { name: 'Replies Received', count: metrics.repliesReceived || 0 },
    { name: 'Positive Leads', count: metrics.positiveReplies || 0 },
    { name: 'Meetings Booked', count: metrics.meetingsRequested || 0 },
  ];

  const channelComparison = [
    { channel: 'Email (Gmail API)', sent: metrics.emailsSent || 0 },
    { channel: 'WhatsApp Cloud API', sent: metrics.whatsappSent || 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Agency Outreach Analytics</h2>
        <p className="text-sm text-slate-500">
          Real metrics backed directly by SQLite database records & provider events
        </p>
      </div>

      {/* Top 4 Analytical KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Total Outreach Sent</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {(metrics.emailsSent || 0) + (metrics.whatsappSent || 0)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.emailsSent || 0} Emails &bull; {metrics.whatsappSent || 0} WhatsApp
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Reply Response Rate</p>
          <h3 className="text-2xl font-bold text-indigo-500 mt-1">
            {metrics.emailsSent > 0
              ? `${Math.round(((metrics.repliesReceived || 0) / (metrics.emailsSent + metrics.whatsappSent)) * 100)}%`
              : '0%'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{metrics.repliesReceived || 0} Total Replies</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Qualified Pipeline</p>
          <h3 className="text-2xl font-bold text-emerald-500 mt-1">
            {(metrics.positiveReplies || 0) + (metrics.meetingsRequested || 0)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Interested + Meeting Requests</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Suppression List (Opt-outs)</p>
          <h3 className="text-2xl font-bold text-rose-500 mt-1">{metrics.optOuts || 0}</h3>
          <p className="text-xs text-slate-500 mt-1">Strictly excluded from sending</p>
        </div>
      </div>

      {/* Conversion Funnel Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Agency Acquisition Conversion Funnel
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Tracking conversion from raw imported lead to meetings requested
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ left: 40, right: 20 }}>
              <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={130} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} name="Lead Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2 Bottom Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Lead Status Distribution
          </h4>
          <div className="space-y-2">
            {(data?.leadStatusBreakdown || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{item.status}</span>
                <span className="font-mono text-slate-500">{item.count} leads</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Channel Dispatch Breakdown
          </h4>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelComparison}>
                <XAxis dataKey="channel" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="sent" fill="#10b981" radius={[6, 6, 0, 0]} name="Dispatched" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
