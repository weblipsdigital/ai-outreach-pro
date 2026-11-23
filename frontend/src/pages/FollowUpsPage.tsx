import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Clock,
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const FollowUpsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: followUps, isLoading } = useQuery({
    queryKey: ['follow-ups'],
    queryFn: () => apiFetch<any[]>('/follow-ups'),
  });

  const processNowMutation = useMutation({
    mutationFn: () => apiFetch('/follow-ups/process-now', { method: 'POST' }),
    onSuccess: (data: any) => {
      showToast(
        `Checked due follow-ups: ${data.executed} executed, ${data.cancelled} auto-cancelled.`,
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/follow-ups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      showToast('Follow-up cancelled', 'info');
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Smart Follow-up Automation</h2>
          <p className="text-sm text-slate-500">
            Automated multi-touch sequences (Day 0 &rarr; Day 4 &rarr; Day 9) with auto-cancellation upon reply or opt-out
          </p>
        </div>

        <button
          onClick={() => processNowMutation.mutate()}
          disabled={processNowMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${processNowMutation.isPending ? 'animate-spin' : ''}`} />
          Process Due Follow-ups Now
        </button>
      </div>

      {/* Sequence Timeline Explainer Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Follow-up Automation Sequence</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-indigo-500">Day 0 (Initial Outreach)</span>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Personalized pitch based on client website status and agency capability.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-purple-500">Day 4 (Follow-up Step 1)</span>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Polite value-focused reminder. Automatically cancelled if client replies before Day 4.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-amber-500">Day 9 (Final Courtesy Check-in)</span>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Final courteous note confirming we will not crowd their inbox.
            </p>
          </div>
        </div>
      </div>

      {/* Follow-up Queue Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Target Lead</th>
                <th className="px-4 py-3.5">Step</th>
                <th className="px-4 py-3.5">Scheduled For</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Loading follow-ups...
                  </td>
                </tr>
              ) : followUps?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No active follow-ups scheduled. They are created automatically when primary messages are dispatched.
                  </td>
                </tr>
              ) : (
                followUps?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.lead?.companyName}
                      </div>
                      <div className="text-xs text-slate-500">{item.lead?.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Step {item.stepNumber} (Day {item.delayDays})
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                      {new Date(item.scheduledFor).toLocaleDateString()}{' '}
                      {new Date(item.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.status === 'SCHEDULED'
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : item.status === 'EXECUTED'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {item.status === 'SCHEDULED' && (
                        <button
                          onClick={() => cancelMutation.mutate(item.id)}
                          className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
