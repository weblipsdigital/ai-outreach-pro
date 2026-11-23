import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  DollarSign,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

export const WhatsAppCampaignsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: waStatus, isLoading } = useQuery({
    queryKey: ['wa-campaign-status'],
    queryFn: () => apiFetch<any>('/integrations/whatsapp/status'),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<any>('/settings'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">WhatsApp Business Cloud Outreach</h2>
        <p className="text-sm text-slate-500">
          Official Meta WhatsApp Cloud API template campaigns with strict opt-in compliance and $0 hard spending cap
        </p>
      </div>

      {/* Safety Policy Alert Banner */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-sm">Official Meta Cloud API Guardrails Enforced</h4>
            <p>
              &bull; <b>Zero Unofficial Automation:</b> We strictly never use WhatsApp Web scrapers or browser-based bulk scripts that violate Meta Terms.
            </p>
            <p>
              &bull; <b>Explicit Consent Mandate:</b> Messages are only drafted for leads with verified <code className="bg-amber-500/20 px-1 py-0.5 rounded">whatsapp_opt_in = true</code>.
            </p>
            <p>
              &bull; <b>Hard Zero Spend Cap:</b> Sending is locked to <b>$0.00</b> by default. Template preview and dry-run simulations operate without incurring any charges.
            </p>
          </div>
        </div>
      </div>

      {/* Status & Limits Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Meta API Status</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                waStatus?.configured ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {waStatus?.configured ? 'Connected' : 'Dry-Run Simulated'}
            </h4>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {waStatus?.phoneNumberId ? `Phone ID: ${waStatus.phoneNumberId}` : 'Simulated Delivery Ready'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Hard Cost Cap</p>
          <div className="flex items-center gap-1.5 mt-2 text-emerald-500">
            <DollarSign className="w-5 h-5" />
            <h4 className="text-xl font-bold">0.00 USD</h4>
          </div>
          <p className="text-xs text-slate-400 mt-1">Free Tier / Dry-Run Safe Mode</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Live Sending Authorization</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                waStatus?.sendingEnabled
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}
            >
              {waStatus?.sendingEnabled ? 'Enabled' : 'Disabled (Default)'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Configurable in Automation Settings</p>
        </div>
      </div>

      {/* Pre-Approved Template Showcase */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Meta Approved Template: client_outreach_v1
            </h3>
            <p className="text-xs text-slate-500">
              Standard outreach template mapped to AI personalization parameters
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Meta Approved
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed max-w-2xl">
          Hi {'{{1}}'}, this is regarding {'{{2}}'}'s {'{{3}}'}. We noticed your recent business initiatives and wanted to share a few ideas on improving mobile and web customer conversion. Would you be open to a 5-minute introductory call next week? Reply STOP anytime to opt out.
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
            <span className="text-slate-400 block font-mono">{'{{1}}'}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Contact First Name</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
            <span className="text-slate-400 block font-mono">{'{{2}}'}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Company Name</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
            <span className="text-slate-400 block font-mono">{'{{3}}'}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Target Agency Service</span>
          </div>
        </div>
      </div>
    </div>
  );
};
