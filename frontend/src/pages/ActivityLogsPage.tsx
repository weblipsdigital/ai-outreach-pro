import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { FileText, Clock, User, Shield } from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiFetch<any[]>('/audit-logs?limit=100'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Activity & Audit Logs</h2>
        <p className="text-sm text-slate-500">
          Immutable audit record of all outreach, AI generations, approvals, and compliance events
        </p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-4 py-3.5">Entity</th>
                <th className="px-4 py-3.5">Operator</th>
                <th className="px-4 py-3.5">Details</th>
                <th className="px-5 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs?.map((log) => {
                  let parsedDetails: any = null;
                  try {
                    parsedDetails = log.details ? JSON.parse(log.details) : null;
                  } catch {
                    parsedDetails = log.details;
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
                        {log.entityType} {log.entityId && `(${log.entityId.slice(0, 8)}...)`}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {log.user?.name || 'System Scheduler'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate font-mono">
                        {parsedDetails ? JSON.stringify(parsedDetails) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
