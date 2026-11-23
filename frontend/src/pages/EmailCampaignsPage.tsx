import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Mail,
  Plus,
  Play,
  Pause,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const EmailCampaignsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targetAudience: 'Local Professional Services & High-Growth SMBs',
    serviceOffered: 'Business website redesign',
    communicationChannel: 'EMAIL',
    dailySendingCap: 10,
    approvalMode: 'MANUAL',
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiFetch<any[]>('/campaigns'),
  });

  const createMutation = useMutation({
    mutationFn: (newCamp: any) =>
      apiFetch('/campaigns', {
        method: 'POST',
        body: JSON.stringify(newCamp),
      }),
    onSuccess: () => {
      showToast('Email Campaign created successfully!', 'success');
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/campaigns/${id}/start`, { method: 'POST' }),
    onSuccess: () => {
      showToast('Campaign started', 'success');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/campaigns/${id}/pause`, { method: 'POST' }),
    onSuccess: () => {
      showToast('Campaign paused', 'info');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Email Outreach Campaigns</h2>
          <p className="text-sm text-slate-500">
            Create, schedule, and automate personalized email sequences via Gmail API
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading campaigns...</div>
        ) : campaigns?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            No campaigns yet. Click "Create Campaign" to begin.
          </div>
        ) : (
          campaigns?.map((camp) => (
            <div
              key={camp.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      camp.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : camp.status === 'PAUSED'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {camp.status}
                  </span>

                  <span className="text-xs text-slate-400 font-medium">
                    Cap: {camp.dailySendingCap}/day
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">{camp.name}</h3>
                <p className="text-xs text-indigo-500 font-medium mt-0.5">{camp.serviceOffered}</p>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{camp.targetAudience}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {camp._count?.recipients || 0} Recipients
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {camp._count?.generatedMessages || 0} Drafts
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {camp._count?.followUps || 0} Follow-ups
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 flex items-center gap-2">
                {camp.status === 'ACTIVE' ? (
                  <button
                    onClick={() => pauseMutation.mutate(camp.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-semibold transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={() => startMutation.mutate(camp.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-semibold transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Campaign
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create Email Campaign</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Campaign Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Q4 Dental Clinics Website Modernization"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Target Audience</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Agency Service</label>
                  <select
                    value={formData.serviceOffered}
                    onChange={(e) => setFormData({ ...formData, serviceOffered: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                  >
                    <option value="Website development">Website development</option>
                    <option value="Business website redesign">Business website redesign</option>
                    <option value="E-commerce website development">E-commerce website development</option>
                    <option value="Android application development">Android application development</option>
                    <option value="Custom web application development">Custom web application development</option>
                    <option value="Website maintenance">Website maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500">Daily Sending Cap</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.dailySendingCap}
                    onChange={(e) => setFormData({ ...formData, dailySendingCap: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
