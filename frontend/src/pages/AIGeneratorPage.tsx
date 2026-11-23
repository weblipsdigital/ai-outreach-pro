import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Sparkles,
  Bot,
  Cpu,
  Mail,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Copy,
  RefreshCw,
} from 'lucide-react';

export const AIGeneratorPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedService, setSelectedService] = useState('Website development');
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);

  // Fetch leads for selector
  const { data: leadsData } = useQuery({
    queryKey: ['leads-selector'],
    queryFn: () => apiFetch<any>('/leads?limit=50'),
  });

  // Fetch free AI models
  const { data: modelsData } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => apiFetch<any>('/ai/models'),
  });

  // Fetch AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => apiFetch<any>('/ai/status'),
  });

  const generateMutation = useMutation({
    mutationFn: (payload: any) =>
      apiFetch<any>('/ai/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setGeneratedDraft(data);
      showToast('Personalized outreach generated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Generation failed', 'error');
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) {
      showToast('Please select a business lead', 'error');
      return;
    }

    generateMutation.mutate({
      leadId: selectedLeadId,
      serviceOverride: selectedService,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI Message Generator</h2>
        <p className="text-sm text-slate-500">
          Hyper-personalized outreach generator using Free OpenRouter Models & Local Ollama
        </p>
      </div>

      {/* Model & Provider Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Primary AI Provider</p>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                OpenRouter Free Tier
              </h4>
              <p className="text-[11px] text-slate-400">Model: {aiStatus?.openrouter?.model || 'openrouter/free'}</p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              aiStatus?.openrouter?.available
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}
          >
            {aiStatus?.openrouter?.available ? 'Connected' : 'Free Mode Ready'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Local Offline Fallback</p>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Local Ollama</h4>
              <p className="text-[11px] text-slate-400">
                {aiStatus?.ollama?.available
                  ? `Installed: ${aiStatus.ollama.installedModels.length} models`
                  : 'Ollama offline on localhost:11434'}
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              aiStatus?.ollama?.available
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            {aiStatus?.ollama?.available ? 'Available' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Main Generator Form */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Select Business Lead *
              </label>
              <select
                required
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
              >
                <option value="">-- Choose verified lead --</option>
                {leadsData?.leads?.map((lead: any) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.companyName} ({lead.contactName}) - {lead.serviceInterest || 'Web Dev'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Agency Capability to Pitch *
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
              >
                <option value="Website development">Website development</option>
                <option value="Business website redesign">Business website redesign</option>
                <option value="E-commerce website development">E-commerce website development</option>
                <option value="Android application development">Android application development</option>
                <option value="Custom web application development">Custom web application development</option>
                <option value="Website maintenance">Website maintenance</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Anti-Hallucination rules active &bull; Unsubscribe footer automatically appended</span>
            </div>

            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Sparkles className={`w-4 h-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
              {generateMutation.isPending ? 'Generating with AI...' : 'Generate Personalized Pitch'}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Output Preview Cards */}
      {generatedDraft && (
        <div className="space-y-4 animate-fadeIn">
          {/* Metadata Banner */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-indigo-400">AI Personalization Reason:</span>{' '}
              <span className="text-slate-300">{generatedDraft.personalizationReason}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-400">Confidence:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                {Math.round(generatedDraft.confidenceScore * 100)}%
              </span>
              <span className="text-slate-400">Model: {generatedDraft.generatedByModel}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Primary Email Draft */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <Mail className="w-4 h-4 text-sky-500" />
                  Primary Email Outreach
                </div>
                <button
                  onClick={() => copyToClipboard(generatedDraft.emailBody)}
                  className="p-1.5 text-slate-400 hover:text-white rounded"
                  title="Copy email body"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 text-xs font-semibold text-slate-500">
                Subject:{' '}
                <span className="text-slate-900 dark:text-white font-medium">{generatedDraft.subject}</span>
              </div>

              <div className="mt-3 flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {generatedDraft.emailBody}
              </div>
            </div>

            {/* Smart Follow-up Email Draft */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <RefreshCw className="w-4 h-4 text-purple-500" />
                  Smart Follow-up (Day 4 Default)
                </div>
                <button
                  onClick={() => copyToClipboard(generatedDraft.followUpEmail)}
                  className="p-1.5 text-slate-400 hover:text-white rounded"
                  title="Copy follow-up draft"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 text-xs font-semibold text-slate-500">
                Subject:{' '}
                <span className="text-slate-900 dark:text-white font-medium">Follow up: {generatedDraft.subject}</span>
              </div>

              <div className="mt-3 flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {generatedDraft.followUpEmail}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
