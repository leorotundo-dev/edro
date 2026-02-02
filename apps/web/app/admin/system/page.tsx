'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';

type FeatureFlag = {
  key: string;
  enabled: boolean;
  description?: string;
  updated_at?: string;
};

type SecurityLog = {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  timestamp: string;
};

type AccessLog = {
  id: string;
  tenant_id: string;
  user_id: string;
  table_name: string;
  operation: string;
  record_id: string;
  timestamp: string;
};

type SecurityDashboard = {
  total_immutable_changes: number;
  total_access_logs: number;
  recent_suspicious_activity: any[];
  top_users_by_activity: any[];
};

export default function AdminSystemPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'flags' | 'security' | 'jobs' | 'dashboard'>('flags');
  const [loading, setLoading] = useState(false);

  // Feature Flags
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(false);

  // Security Logs
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [securityDashboard, setSecurityDashboard] = useState<SecurityDashboard | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  // Jobs
  const [jobStatus, setJobStatus] = useState<string>('');
  const [loadingJob, setLoadingJob] = useState(false);

  useEffect(() => {
    if (activeTab === 'flags') {
      loadFlags();
    } else if (activeTab === 'security') {
      loadSecurityLogs();
    } else if (activeTab === 'dashboard') {
      loadSecurityDashboard();
    }
  }, [activeTab]);

  const loadFlags = async () => {
    setLoadingFlags(true);
    try {
      const res = await apiGet<{ success: boolean; flags: FeatureFlag[] }>('/flags');
      if (res?.flags) {
        setFlags(res.flags);
      }
    } catch (error) {
      console.error('Failed to load flags:', error);
    } finally {
      setLoadingFlags(false);
    }
  };

  const toggleFlag = async (key: string, currentEnabled: boolean) => {
    try {
      await apiPost(`/flags/${key}`, { enabled: !currentEnabled });
      await loadFlags();
    } catch (error) {
      console.error('Failed to toggle flag:', error);
    }
  };

  const loadSecurityLogs = async () => {
    setLoadingSecurity(true);
    try {
      const [immutableRes, accessRes] = await Promise.all([
        apiGet<{ success: boolean; logs: SecurityLog[] }>('/security/immutable-audit'),
        apiGet<{ success: boolean; logs: AccessLog[] }>('/security/access-logs'),
      ]);

      if (immutableRes?.logs) setSecurityLogs(immutableRes.logs);
      if (accessRes?.logs) setAccessLogs(accessRes.logs);
    } catch (error) {
      console.error('Failed to load security logs:', error);
    } finally {
      setLoadingSecurity(false);
    }
  };

  const loadSecurityDashboard = async () => {
    setLoadingSecurity(true);
    try {
      const res = await apiGet<{ success: boolean; data: SecurityDashboard }>('/security/dashboard');
      if (res?.data) {
        setSecurityDashboard(res.data);
      }
    } catch (error) {
      console.error('Failed to load security dashboard:', error);
    } finally {
      setLoadingSecurity(false);
    }
  };

  const triggerLibraryJob = async () => {
    setLoadingJob(true);
    setJobStatus('');
    try {
      const res = await apiPost<{ success: boolean; message: string }>('/admin/jobs/library', {});
      setJobStatus(res?.message || 'Job triggered successfully');
    } catch (error: any) {
      setJobStatus(`Error: ${error.message}`);
    } finally {
      setLoadingJob(false);
    }
  };

  const renderFeatureFlags = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Feature Flags</h3>
          <p className="text-sm text-slate-600">Gerencie features toggles do sistema</p>
        </div>
        <button
          onClick={loadFlags}
          className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
        </button>
      </div>

      {loadingFlags ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-card hover:shadow-card-hover transition-all duration-200">
          {flags.length > 0 ? (
            flags.map((flag) => (
              <div key={flag.key} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors duration-200 first:rounded-t-2xl last:rounded-b-2xl">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{flag.key}</div>
                  {flag.description && (
                    <div className="text-sm text-slate-500 mt-1">{flag.description}</div>
                  )}
                  {flag.updated_at && (
                    <div className="text-xs text-slate-400 mt-1">
                      Updated: {new Date(flag.updated_at).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleFlag(flag.key, flag.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    flag.enabled ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      flag.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500">Nenhum feature flag encontrado</div>
          )}
        </div>
      )}
    </div>
  );

  const renderSecurityLogs = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Immutable Field Audit Logs</h3>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200">
          {loadingSecurity ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            </div>
          ) : securityLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Field</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Old Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {securityLogs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{log.user_id}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {log.entity_type} ({log.entity_id})
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-900">{log.field_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{log.old_value}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{log.new_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">Nenhum log de auditoria encontrado</div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Access Logs</h3>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {accessLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Table</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Operation</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">Record ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accessLogs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{log.user_id}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{log.table_name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.operation === 'SELECT'
                              ? 'bg-blue-100 text-blue-700'
                              : log.operation === 'INSERT'
                              ? 'bg-green-100 text-green-700'
                              : log.operation === 'UPDATE'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {log.operation}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{log.record_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">Nenhum access log encontrado</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderJobs = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Manual Job Triggers</h3>
        <p className="text-sm text-slate-600 mb-6">Acione jobs de processamento manualmente</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card hover:shadow-card-hover transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="font-medium text-slate-900 mb-1">Library Processing Job</h4>
            <p className="text-sm text-slate-600">
              Processa arquivos pendentes na biblioteca de clientes (OCR, embeddings, etc.)
            </p>
          </div>
          <button
            onClick={triggerLibraryJob}
            disabled={loadingJob}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingJob ? (
              <>
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                Processando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                Executar Job
              </>
            )}
          </button>
        </div>

        {jobStatus && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              jobStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {jobStatus}
          </div>
        )}
      </div>
    </div>
  );

  const renderSecurityDashboard = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Security Analytics</h3>
      </div>

      {loadingSecurity ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
        </div>
      ) : securityDashboard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card hover:shadow-card-hover transition-all duration-200">
            <div className="text-sm text-slate-600 mb-2">Total Immutable Changes</div>
            <div className="text-3xl font-bold text-error-600">
              {securityDashboard.total_immutable_changes}
            </div>
            <div className="text-xs text-slate-500 mt-2">Tentativas de alterar campos imutáveis</div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card hover:shadow-card-hover transition-all duration-200">
            <div className="text-sm text-slate-600 mb-2">Total Access Logs</div>
            <div className="text-3xl font-bold text-info-600">{securityDashboard.total_access_logs}</div>
            <div className="text-xs text-slate-500 mt-2">Registros de acesso ao banco</div>
          </div>

          {securityDashboard.recent_suspicious_activity?.length > 0 && (
            <div className="col-span-2 bg-white rounded-lg border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Recent Suspicious Activity</h4>
              <div className="space-y-2">
                {securityDashboard.recent_suspicious_activity.map((activity: any, idx: number) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-900">{JSON.stringify(activity)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {securityDashboard.top_users_by_activity?.length > 0 && (
            <div className="col-span-2 bg-white rounded-lg border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-900 mb-4">Top Users by Activity</h4>
              <div className="space-y-2">
                {securityDashboard.top_users_by_activity.map((user: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-900">{user.user_id || user.email}</span>
                    <span className="text-sm font-semibold text-slate-700">{user.count} actions</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500">Nenhum dado de segurança disponível</div>
      )}
    </div>
  );

  return (
    <AppShell title="System Admin">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">System Administration</h1>
          <p className="text-slate-600">Gerencie configurações avançadas do sistema</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('flags')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'flags'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Feature Flags
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'security'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Security Logs
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'jobs'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Jobs
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'flags' && renderFeatureFlags()}
          {activeTab === 'security' && renderSecurityLogs()}
          {activeTab === 'jobs' && renderJobs()}
          {activeTab === 'dashboard' && renderSecurityDashboard()}
        </div>
      </div>
    </AppShell>
  );
}
