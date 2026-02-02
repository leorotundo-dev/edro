'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost } from '@/lib/api';

type Connector = {
  provider: string;
  enabled: boolean;
  config: Record<string, any>;
  last_sync?: string;
  status?: string;
};

type AvailableProvider = {
  id: string;
  name: string;
  description: string;
  icon: string;
  configFields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'select';
    required: boolean;
    options?: string[];
  }[];
};

const AVAILABLE_PROVIDERS: AvailableProvider[] = [
  {
    id: 'reportei',
    name: 'Reportei',
    description: 'Integração com Reportei para métricas de redes sociais',
    icon: '📊',
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'account_id', label: 'Account ID', type: 'text', required: true },
      { key: 'sync_frequency', label: 'Frequência de Sync', type: 'select', required: true, options: ['daily', 'weekly', 'monthly'] },
    ],
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Integração com Facebook/Instagram Ads Manager',
    icon: '📘',
    configFields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', required: true },
    ],
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Integração com Google Ads para performance de campanhas',
    icon: '🔍',
    configFields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true },
      { key: 'customer_id', label: 'Customer ID', type: 'text', required: true },
    ],
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    description: 'Dados de tráfego e conversões do Google Analytics',
    icon: '📈',
    configFields: [
      { key: 'view_id', label: 'View ID', type: 'text', required: true },
      { key: 'service_account_json', label: 'Service Account JSON', type: 'password', required: true },
    ],
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    description: 'Webhook personalizado para receber dados externos',
    icon: '🔗',
    configFields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
      { key: 'secret_key', label: 'Secret Key', type: 'password', required: false },
    ],
  },
];

export default function ClientConnectorsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    loadConnectors();
  }, [clientId]);

  const loadConnectors = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; connectors: Connector[] }>(
        `/clients/${clientId}/connectors`
      );
      if (res?.connectors) {
        setConnectors(res.connectors);
      }
    } catch (error) {
      console.error('Failed to load connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConfigModal = async (provider: string) => {
    setSelectedProvider(provider);
    setSaveStatus('');

    // Load existing config if available
    try {
      const res = await apiGet<{ success: boolean; connector: Connector }>(
        `/clients/${clientId}/connectors/${provider}`
      );
      if (res?.connector?.config) {
        setConfigForm(res.connector.config);
      } else {
        setConfigForm({});
      }
    } catch (error) {
      setConfigForm({});
    }
  };

  const closeConfigModal = () => {
    setSelectedProvider(null);
    setConfigForm({});
    setSaveStatus('');
  };

  const saveConnector = async () => {
    if (!selectedProvider) return;

    setSaving(true);
    setSaveStatus('');
    try {
      await apiPost(`/clients/${clientId}/connectors/${selectedProvider}`, {
        enabled: true,
        config: configForm,
      });
      setSaveStatus('Connector saved successfully!');
      await loadConnectors();
      setTimeout(() => {
        closeConfigModal();
      }, 1500);
    } catch (error: any) {
      setSaveStatus(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getConnectorStatus = (provider: string): Connector | null => {
    return connectors.find((c) => c.provider === provider) || null;
  };

  const providerInfo = selectedProvider
    ? AVAILABLE_PROVIDERS.find((p) => p.id === selectedProvider)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <div className="mt-4 text-slate-600">Loading connectors...</div>
        </div>
      </div>
    );
  }

  return (
    <AppShell title="Integrations">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/clients/${clientId}`)}
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Voltar para Cliente
          </button>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Integrations & Connectors</h1>
          <p className="text-slate-600">Configure integrações com plataformas externas</p>
        </div>

        {/* Available Connectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_PROVIDERS.map((provider) => {
            const status = getConnectorStatus(provider.id);
            const isConnected = status?.enabled || false;

            return (
              <div
                key={provider.id}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{provider.icon}</div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Conectado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-600 mb-4">{provider.description}</p>

                {status?.last_sync && (
                  <div className="text-xs text-slate-500 mb-4">
                    Último sync: {new Date(status.last_sync).toLocaleString('pt-BR')}
                  </div>
                )}

                <button
                  onClick={() => openConfigModal(provider.id)}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isConnected
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isConnected ? 'Gerenciar' : 'Configurar'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Config Modal */}
        {selectedProvider && providerInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{providerInfo.icon}</div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{providerInfo.name}</h2>
                      <p className="text-sm text-slate-600">{providerInfo.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeConfigModal}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {providerInfo.configFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={configForm[field.key] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={field.required}
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={configForm[field.key] || ''}
                        onChange={(e) => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={field.required}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}

                {saveStatus && (
                  <div
                    className={`p-4 rounded-lg ${
                      saveStatus.startsWith('Error')
                        ? 'bg-red-50 text-red-700'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {saveStatus}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-200 flex gap-3">
                <button
                  onClick={closeConfigModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveConnector}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Salvando...' : 'Salvar Connector'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
