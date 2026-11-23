import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Inbox,
  Mail,
  MessageSquare,
  Send,
  Search,
  CheckCircle2,
  Clock,
  User,
  Building,
} from 'lucide-react';

export const InboxPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');

  const { data: conversations, isLoading: loadingList } = useQuery({
    queryKey: ['conversations', search],
    queryFn: () => apiFetch<any[]>(`/inbox?search=${encodeURIComponent(search)}`),
  });

  const { data: activeConversation, isLoading: loadingDetail } = useQuery({
    queryKey: ['conversation-detail', selectedConvId],
    queryFn: () => (selectedConvId ? apiFetch<any>(`/inbox/${selectedConvId}`) : null),
    enabled: !!selectedConvId,
  });

  const statusUpdateMutation = useMutation({
    mutationFn: ({ convId, status }: { convId: string; status: string }) =>
      apiFetch(`/inbox/${convId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      showToast('Lead status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedConvId] });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/inbox/${selectedConvId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content: replyText }),
      }),
    onSuccess: () => {
      showToast('Reply dispatched!', 'success');
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Unified Outreach Inbox</h2>
        <p className="text-sm text-slate-500">
          Track prospect responses from Gmail and WhatsApp Cloud with manual reply controls
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Left Column: Conversations List */}
        <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loadingList ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading inbox...</div>
            ) : conversations?.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active conversations found yet.
              </div>
            ) : (
              conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                    selectedConvId === conv.id
                      ? 'bg-indigo-50/70 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      conv.channel === 'EMAIL'
                        ? 'bg-sky-500/10 text-sky-500'
                        : 'bg-green-500/10 text-green-500'
                    }`}
                  >
                    {conv.channel === 'EMAIL' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {conv.lead?.companyName}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{conv.lead?.contactName}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      {conv.messages?.[0]?.content || conv.subject || 'Outreach initiated'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation & Messages */}
        <div className="lg:col-span-8 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40">
          {activeConversation ? (
            <>
              {/* Thread Header */}
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeConversation.lead?.companyName} &bull; {activeConversation.lead?.contactName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeConversation.lead?.email} {activeConversation.lead?.phone && `| ${activeConversation.lead?.phone}`}
                  </p>
                </div>

                {/* Lead Status Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Status:</span>
                  <select
                    value={activeConversation.lead?.status}
                    onChange={(e) =>
                      statusUpdateMutation.mutate({
                        convId: activeConversation.id,
                        status: e.target.value,
                      })
                    }
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="REPLIED">REPLIED</option>
                    <option value="INTERESTED">INTERESTED</option>
                    <option value="MEETING_REQUESTED">MEETING REQUESTED</option>
                    <option value="NOT_INTERESTED">NOT INTERESTED</option>
                    <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              {/* Message Bubbles History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeConversation.messages?.map((msg: any) => {
                  const isOutbound = msg.direction === 'OUTBOUND';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-slate-400 mb-1 px-1">
                        {isOutbound ? 'You (Agency Outreach)' : activeConversation.lead?.contactName} &bull;{' '}
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div
                        className={`max-w-xl p-3.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                          isOutbound
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                        }`}
                      >
                        {msg.subject && (
                          <div className={`font-bold mb-1 pb-1 border-b ${isOutbound ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-700'}`}>
                            Subject: {msg.subject}
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    placeholder="Type an authorized manual reply to client..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => sendReplyMutation.mutate()}
                    disabled={sendReplyMutation.isPending || !replyText.trim()}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Human verification safeguard: AI automated replies are never dispatched without explicit review.
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Inbox className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">Select a conversation from the left to view message history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
