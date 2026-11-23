import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  KeyRound,
  Mail,
  Bot,
  MessageSquare,
  CheckCircle,
  XCircle,
  ExternalLink,
  Save,
} from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [openRouterKey, setOpenRouterKey] = useState('');
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waAppSecret, setWaAppSecret] = useState('');

  // Fetch Google OAuth status
  const { data: googleStatus } = useQuery({
    queryKey: ['google-status'],
    queryFn: () => apiFetch<any>('/integrations/google/status'),
  });

  // Fetch AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => apiFetch<any>('/ai/status'),
  });

  // Fetch WhatsApp status
  const { data: waStatus } = useQuery({
    queryKey: ['wa-status'],
    queryFn: () => apiFetch<any>('/integrations/whatsapp/status'),
  });

  const connectGoogle = async () => {
    try {
      const data = await apiFetch<any>('/integrations/google/auth-url');
      window.location.href = data.url;
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const disconnectGoogleMutation = useMutation({
    mutationFn: () => apiFetch('/integrations/google/disconnect', { method: 'POST' }),
    onSuccess: () => {
      showToast('Gmail account disconnected', 'info');
      queryClient.invalidateQueries({ queryKey: ['google-status'] });
    },
  });

  const saveWhatsAppMutation = useMutation({
    mutationFn: () =>
      apiFetch('/integrations/whatsapp/config', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumberId: waPhoneNumberId,
          accessToken: waAccessToken,
          appSecret: waAppSecret,
        }),
      }),
    onSuccess: () => {
      showToast('WhatsApp credentials saved', 'success');
      queryClient.invalidateQueries({ queryKey: ['wa-status'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">API Integrations</h2>
        <p className="text-sm text-slate-500">
          Manage free AI providers, Gmail OAuth, and Meta WhatsApp Cloud credentials
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OpenRouter AI Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">OpenRouter Free AI</h3>
                <p className="text-xs text-slate-400">Endpoint: https://openrouter.ai/api/v1</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                aiStatus?.openrouter?.available
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-amber-500/10 text-amber-500'
              }`}
            >
              {aiStatus?.openrouter?.available ? 'Connected' : 'Free Auto-Fallback'}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            OpenRouter provides free tier access to top open models (Llama 3.2 3B Instruct Free, Gemini 2.0 Flash Lite Free, DeepSeek R1 Free).
          </p>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Model Selector:</p>
            <p className="font-mono text-indigo-500 dark:text-indigo-400 mt-0.5">
              {aiStatus?.openrouter?.model || 'openrouter/free'}
            </p>
          </div>
        </div>

        {/* Local Ollama Server Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Local Ollama Fallback</h3>
                <p className="text-xs text-slate-400">100% Free & Offline (localhost:11434)</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                aiStatus?.ollama?.available
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {aiStatus?.ollama?.available ? 'Online' : 'Standby'}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Install Ollama locally to generate outreach copy even with zero internet connectivity.
          </p>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Detected Local Models:</p>
            <p className="font-mono text-slate-500 mt-0.5">
              {aiStatus?.ollama?.installedModels?.length > 0
                ? aiStatus.ollama.installedModels.join(', ')
                : 'No local models detected (e.g. run "ollama run llama3")'}
            </p>
          </div>
        </div>

        {/* Google OAuth & Gmail API */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Google / Gmail API</h3>
                <p className="text-xs text-slate-400">Free OAuth 2.0 Account Sending</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                googleStatus?.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {googleStatus?.connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Connect your agency Google account using standard OAuth 2.0. Eliminates the need for expensive third-party SMTP relay services.
          </p>

          {googleStatus?.connected ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-mono text-slate-700 dark:text-slate-300">{googleStatus.emailAddress}</span>
              <button
                onClick={() => disconnectGoogleMutation.mutate()}
                className="text-xs font-semibold text-rose-500 hover:underline"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectGoogle}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Connect Gmail with Google OAuth
            </button>
          )}
        </div>

        {/* WhatsApp Business Cloud API */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Meta WhatsApp Cloud</h3>
                <p className="text-xs text-slate-400">Official Graph API (v21.0)</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
              $0 Spend Safety Cap
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Configure official Meta Cloud credentials. If left empty, dry-run simulation delivers simulated WhatsApp events without errors.
          </p>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="WhatsApp Phone Number ID"
              value={waPhoneNumberId}
              onChange={(e) => setWaPhoneNumberId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
            <input
              type="password"
              placeholder="System User Access Token"
              value={waAccessToken}
              onChange={(e) => setWaAccessToken(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
            <button
              onClick={() => saveWhatsAppMutation.mutate()}
              className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold"
            >
              Save WhatsApp Config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
