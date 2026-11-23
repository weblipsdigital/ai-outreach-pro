import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Sliders,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Save,
  Check,
  StopCircle,
} from 'lucide-react';

export const AutomationSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<any>('/settings'),
  });

  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, string>) =>
      apiFetch('/settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      showToast('Settings saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
    },
  });

  const emergencyStopMutation = useMutation({
    mutationFn: () => apiFetch('/settings/emergency-stop', { method: 'POST' }),
    onSuccess: () => {
      showToast('EMERGENCY STOP TRIGGERED: Sending paused & DRY-RUN engaged.', 'error');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleToggle = (key: string) => {
    const newVal = settings[key] === 'true' ? 'false' : 'true';
    setSettings((prev) => ({ ...prev, [key]: newVal }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(settings);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Automation Controls & Safety Rails</h2>
          <p className="text-sm text-slate-500">
            Configure system execution limits, dry-run toggles, and safety safeguards
          </p>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={() => {
            if (confirm('TRIGGER EMERGENCY STOP? All active campaigns will be paused and DRY_RUN forced immediately.')) {
              emergencyStopMutation.mutate();
            }
          }}
          disabled={emergencyStopMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30 transition-all"
        >
          <StopCircle className="w-4 h-4" />
          EMERGENCY STOP
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Switches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DRY RUN Toggle */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
            <div className="pr-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Dry-Run Simulation Mode</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                When enabled, the entire workflow (AI generation, approvals, follow-ups) runs normally without calling real Gmail or WhatsApp endpoints.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('DRY_RUN')}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.DRY_RUN === 'true' ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Auto-Approve Toggle */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
            <div className="pr-4">
              <span className="font-bold text-slate-900 dark:text-white text-sm">Auto-Approve AI Drafts</span>
              <p className="text-xs text-slate-500 mt-1">
                If disabled (recommended), every AI draft must be reviewed in the Message Approval Queue before it can be sent.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('AUTO_APPROVE')}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.AUTO_APPROVE === 'true' ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Live Auto-Send Toggle */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
            <div className="pr-4">
              <span className="font-bold text-slate-900 dark:text-white text-sm">Automated Sending Worker</span>
              <p className="text-xs text-slate-500 mt-1">
                Allows scheduled follow-up cron jobs to dispatch messages automatically without manual button clicks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('AUTO_SEND')}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.AUTO_SEND === 'true' ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* WhatsApp Live Send Switch */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
            <div className="pr-4">
              <span className="font-bold text-slate-900 dark:text-white text-sm">Meta WhatsApp Live Dispatch</span>
              <p className="text-xs text-slate-500 mt-1">
                Disabled by default to prevent unexpected charges. Requires Meta Business Account authorization.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('WHATSAPP_SEND_ENABLED')}
              className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                settings.WHATSAPP_SEND_ENABLED === 'true' ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        {/* Numeric Limits & Timing */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Daily Limits & Follow-up Intervals</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500">Daily Email Limit (Safe Cap)</label>
              <input
                type="number"
                min="1"
                max="200"
                value={settings.DAILY_EMAIL_LIMIT || '10'}
                onChange={(e) => setSettings({ ...settings, DAILY_EMAIL_LIMIT: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Daily WhatsApp Limit</label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.DAILY_WHATSAPP_LIMIT || '10'}
                onChange={(e) => setSettings({ ...settings, DAILY_WHATSAPP_LIMIT: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Follow-up Step 1 (Days)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.FOLLOWUP_DAY_STEP_1 || '4'}
                onChange={(e) => setSettings({ ...settings, FOLLOWUP_DAY_STEP_1: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Follow-up Step 2 (Days)</label>
              <input
                type="number"
                min="2"
                max="60"
                value={settings.FOLLOWUP_DAY_STEP_2 || '9'}
                onChange={(e) => setSettings({ ...settings, FOLLOWUP_DAY_STEP_2: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Automation Rules'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
