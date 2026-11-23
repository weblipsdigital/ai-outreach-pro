import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  CheckSquare,
  Check,
  X,
  Send,
  Edit2,
  Sparkles,
  Mail,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

export const ApprovalQueuePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selectedForEdit, setSelectedForEdit] = useState<any>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['messages-pending'],
    queryFn: () => apiFetch<any>('/messages?status=PENDING_APPROVAL&limit=50'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/messages/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      showToast('Message approved and added to send queue!', 'success');
      queryClient.invalidateQueries({ queryKey: ['messages-pending'] });
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch('/messages/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      showToast('All eligible messages approved!', 'success');
      queryClient.invalidateQueries({ queryKey: ['messages-pending'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/messages/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Rejected during manual review' }),
      }),
    onSuccess: () => {
      showToast('Message rejected', 'info');
      queryClient.invalidateQueries({ queryKey: ['messages-pending'] });
    },
  });

  const saveEditAndApprove = useMutation({
    mutationFn: () =>
      apiFetch(`/messages/${selectedForEdit.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          modifiedSubject: editedSubject,
          modifiedBody: editedBody,
        }),
      }),
    onSuccess: () => {
      showToast('Message updated and approved!', 'success');
      setSelectedForEdit(null);
      queryClient.invalidateQueries({ queryKey: ['messages-pending'] });
    },
  });

  const messages = data?.messages || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Message Approval Queue</h2>
          <p className="text-sm text-slate-500">
            Review, edit, and approve AI-generated outreach drafts before dispatch
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => {
              const ids = messages.map((m: any) => m.id);
              bulkApproveMutation.mutate(ids);
            }}
            disabled={bulkApproveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Check className="w-4 h-4" />
            Bulk Approve All ({messages.length})
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading pending approval queue...</div>
      ) : messages.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <CheckSquare className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Approval Queue is Clear!</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            All AI outreach messages have been reviewed. Generate new drafts from the AI Message Generator or Campaigns tab.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg: any) => (
            <div
              key={msg.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-5 items-start justify-between"
            >
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-base">
                    {msg.lead?.companyName}
                  </span>
                  <span className="text-xs text-slate-400">&bull; {msg.lead?.contactName}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {msg.suggestedService}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                    Confidence: {Math.round(msg.confidenceScore * 100)}%
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">Personalization Reason:</span>{' '}
                  {msg.personalizationReason}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  <p className="font-bold text-indigo-500 dark:text-indigo-400 mb-1">
                    Subject: {msg.subject}
                  </p>
                  {msg.emailBody}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex lg:flex-col items-center gap-2 flex-shrink-0 w-full lg:w-36">
                <button
                  onClick={() => approveMutation.mutate(msg.id)}
                  disabled={approveMutation.isPending}
                  className="flex-1 lg:w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm shadow-emerald-600/20 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>

                <button
                  onClick={() => {
                    setSelectedForEdit(msg);
                    setEditedSubject(msg.subject);
                    setEditedBody(msg.emailBody);
                  }}
                  className="flex-1 lg:w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Draft
                </button>

                <button
                  onClick={() => rejectMutation.mutate(msg.id)}
                  disabled={rejectMutation.isPending}
                  className="flex-1 lg:w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {selectedForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Edit Outreach for {selectedForEdit.lead?.companyName}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Modify the subject and message copy. Changes will be saved and approved immediately.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500">Subject</label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Message Body</label>
                <textarea
                  rows={8}
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForEdit(null)}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveEditAndApprove.mutate()}
                  disabled={saveEditAndApprove.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Save & Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
