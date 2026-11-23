import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const GoogleSheetsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['sheets-status'],
    queryFn: () => apiFetch<any>('/sheets/status'),
  });

  const connectMutation = useMutation({
    mutationFn: (config: any) =>
      apiFetch('/sheets/connect', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      showToast('Google Sheets configuration saved!', 'success');
      queryClient.invalidateQueries({ queryKey: ['sheets-status'] });
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
    },
  });

  const previewMutation = useMutation({
    mutationFn: () =>
      apiFetch<any>('/sheets/preview', {
        method: 'POST',
        body: JSON.stringify({
          spreadsheetId: spreadsheetId || statusData?.spreadsheetId,
          sheetName,
        }),
      }),
    onSuccess: (data) => {
      setPreviewRows(data.sampleRows || []);
      showToast(`Found ${data.rowCount} rows in sheet`, 'info');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to preview sheet. Check permissions or ID.', 'error');
    },
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      apiFetch<any>('/sheets/sync', {
        method: 'POST',
        body: JSON.stringify({
          spreadsheetId: spreadsheetId || statusData?.spreadsheetId,
          sheetName,
        }),
      }),
    onSuccess: (data) => {
      showToast(
        `Synchronized: ${data.createdCount} new leads, ${data.updatedCount} updated.`,
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['sheets-status'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Sync failed', 'error');
    },
  });

  const handleSaveConnect = (e: React.FormEvent) => {
    e.preventDefault();
    connectMutation.mutate({ spreadsheetId, sheetName });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Google Sheets Integration</h2>
        <p className="text-sm text-slate-500">
          Sync agency client prospects with automated deduplication and formula injection protection
        </p>
      </div>

      {/* Connection Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Spreadsheet Connection</h3>
              <p className="text-xs text-slate-500">
                {statusData?.connected
                  ? `Connected to: ${statusData.spreadsheetId}`
                  : 'No Google Sheet currently attached'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusData?.connected ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400">
                Disconnected
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveConnect} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Google Spreadsheet ID *
              </label>
              <input
                type="text"
                placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                value={spreadsheetId || statusData?.spreadsheetId || ''}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1 font-mono"
              />
              <span className="text-[11px] text-slate-400">
                Found in the sheet URL: docs.google.com/spreadsheets/d/<b>[SPREADSHEET_ID]</b>/edit
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Worksheet Tab Name
              </label>
              <input
                type="text"
                placeholder="Sheet1"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={connectMutation.isPending}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
            >
              {connectMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>

            <button
              type="button"
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
            >
              {previewMutation.isPending ? 'Reading...' : 'Preview Rows'}
            </button>

            <button
              type="button"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync Leads Now'}
            </button>
          </div>
        </form>
      </div>

      {/* Safety & Expected Columns Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-500 font-semibold text-sm mb-2">
            <ShieldCheck className="w-4 h-4" />
            Expected 15 Column Headers
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
            <span>&bull; lead_id</span>
            <span>&bull; existing_website_status</span>
            <span>&bull; company_name</span>
            <span>&bull; service_interest</span>
            <span>&bull; contact_name</span>
            <span>&bull; email_permission</span>
            <span>&bull; business_type</span>
            <span>&bull; whatsapp_opt_in</span>
            <span>&bull; email</span>
            <span>&bull; consent_source</span>
            <span>&bull; phone</span>
            <span>&bull; consent_timestamp</span>
            <span>&bull; website</span>
            <span>&bull; notes</span>
            <span>&bull; location</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            Automated Protection Guardrails
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
            <li>Never interprets empty cell as consent (requires explicit true/yes).</li>
            <li>Formula Injection Defense: Sanitizes =, +, -, @ to prevent spreadsheet macros.</li>
            <li>Phone numbers automatically converted to global E.164 standard.</li>
            <li>Preserves unsubscribed & suppression status upon re-import.</li>
          </ul>
        </div>
      </div>

      {/* Preview Section */}
      {previewRows.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-3">
            Sheet Preview (First {previewRows.length} rows)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase">
                <tr>
                  <th className="p-2">Lead ID</th>
                  <th className="p-2">Company</th>
                  <th className="p-2">Contact</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Service</th>
                  <th className="p-2">Email Consent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {previewRows.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2 font-mono">{r.lead_id}</td>
                    <td className="p-2 font-semibold">{r.company_name}</td>
                    <td className="p-2">{r.contact_name}</td>
                    <td className="p-2 font-mono">{r.email}</td>
                    <td className="p-2">{r.phone || '-'}</td>
                    <td className="p-2">{r.service_interest || '-'}</td>
                    <td className="p-2">{String(r.email_permission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
