import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.js';
import {
  Users,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LeadsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    lead_id: '',
    company_name: '',
    contact_name: '',
    business_type: '',
    email: '',
    phone: '',
    website: '',
    location: '',
    existing_website_status: '',
    service_interest: 'Website development',
    email_permission: true,
    whatsapp_opt_in: false,
    consent_source: 'Direct Business Inbound',
    notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search, statusFilter],
    queryFn: () =>
      apiFetch<any>(
        `/leads?page=${page}&limit=15&search=${encodeURIComponent(search)}&status=${statusFilter}`
      ),
  });

  const createMutation = useMutation({
    mutationFn: (newLead: any) =>
      apiFetch('/leads', {
        method: 'POST',
        body: JSON.stringify(newLead),
      }),
    onSuccess: () => {
      showToast('Lead created successfully!', 'success');
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setFormData({
        lead_id: '',
        company_name: '',
        contact_name: '',
        business_type: '',
        email: '',
        phone: '',
        website: '',
        location: '',
        existing_website_status: '',
        service_interest: 'Website development',
        email_permission: true,
        whatsapp_opt_in: false,
        consent_source: 'Direct Business Inbound',
        notes: '',
      });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create lead', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      showToast('Lead deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const generateSingleDraftMutation = useMutation({
    mutationFn: (leadId: string) =>
      apiFetch('/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ leadId }),
      }),
    onSuccess: () => {
      showToast('AI outreach draft generated!', 'success');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lead_id) {
      formData.lead_id = `LEAD-${Date.now().toString().slice(-5)}`;
    }
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      NEW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      DRAFTED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      CONTACTED: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      REPLIED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      INTERESTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      MEETING_REQUESTED: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      NOT_INTERESTED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      UNSUBSCRIBED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      CLOSED: 'bg-emerald-600/10 text-emerald-500 border-emerald-600/20',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] || map.NEW}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Business Leads</h2>
          <p className="text-sm text-slate-500">
            Validated prospect database with explicit consent tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/sheets"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Sync from Sheets
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, contact name, email, or lead ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="DRAFTED">DRAFTED</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="REPLIED">REPLIED</option>
            <option value="INTERESTED">INTERESTED</option>
            <option value="MEETING_REQUESTED">MEETING REQUESTED</option>
            <option value="UNSUBSCRIBED">UNSUBSCRIBED</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Company & Contact</th>
                <th className="px-4 py-3.5">Service Interest</th>
                <th className="px-4 py-3.5">Existing Web Status</th>
                <th className="px-4 py-3.5">Consent (Email / WA)</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Loading verified leads...
                  </td>
                </tr>
              ) : data?.leads?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No leads found. Sync from Google Sheets or click "Add Lead".
                  </td>
                </tr>
              ) : (
                data?.leads?.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {lead.companyName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {lead.contactName} &bull; <span className="font-mono">{lead.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {lead.serviceInterest || 'Web Development'}
                      </span>
                      {lead.businessType && (
                        <div className="text-[11px] text-slate-400">{lead.businessType}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {lead.existingWebsiteStatus || 'Needs evaluation'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`flex items-center gap-1 ${
                            lead.emailPermission ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                          title={lead.emailPermission ? 'Explicit Email Consent' : 'No Consent'}
                        >
                          {lead.emailPermission ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          Email
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            lead.whatsappOptIn ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                          title={lead.whatsappOptIn ? 'WhatsApp Opted In' : 'No Opt-in'}
                        >
                          {lead.whatsappOptIn ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          WA
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(lead.status)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lead.emailPermission && (
                          <button
                            onClick={() => generateSingleDraftMutation.mutate(lead.id)}
                            className="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                            title="Generate AI Outreach Message"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Delete lead ${lead.companyName}?`)) {
                              deleteMutation.mutate(lead.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {data?.pagination && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>
              Showing page {data.pagination.page} of {data.pagination.totalPages || 1} ({data.pagination.total} leads)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Verified Lead</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Company Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Contact Person *</label>
                  <input
                    required
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Phone (E.164)</label>
                  <input
                    type="text"
                    placeholder="+14155552671"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Service Interest</label>
                  <select
                    value={formData.service_interest}
                    onChange={(e) => setFormData({ ...formData, service_interest: e.target.value })}
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
                  <label className="text-xs font-semibold text-slate-500">Existing Web Presence</label>
                  <input
                    type="text"
                    placeholder="e.g. Outdated design, slow load"
                    value={formData.existing_website_status}
                    onChange={(e) => setFormData({ ...formData, existing_website_status: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mt-1"
                  />
                </div>
              </div>

              {/* Consent check */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Strict Consent Verification</p>
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.email_permission}
                    onChange={(e) => setFormData({ ...formData, email_permission: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Lead has granted explicit email outreach permission</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.whatsapp_opt_in}
                    onChange={(e) => setFormData({ ...formData, whatsapp_opt_in: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Lead has explicitly opted into WhatsApp communications</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
