'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Clock, Smartphone, Users, XCircle } from 'lucide-react';
import { Button, Card, DataTable, StatCard } from '@edro/ui';
import { apiGet, type ApiResponse } from '@/lib/api';

type NotificationLog = {
  id: string;
  user_id: string;
  event_type: string;
  channel: string;
  status: string;
  title?: string | null;
  body?: string | null;
  reason?: string | null;
  created_at?: string | null;
  sent_at?: string | null;
  read_at?: string | null;
  name?: string | null;
  email?: string | null;
};

type NotificationPreference = {
  user_id: string;
  channel: string;
  enabled: boolean;
  quiet_hours?: { start?: string; end?: string } | null;
  max_per_day?: number | null;
  min_interval_minutes?: number | null;
  topics?: string[] | null;
  updated_at?: string | null;
  name?: string | null;
  email?: string | null;
};

type NotificationDevice = {
  user_id: string;
  provider: string;
  token: string;
  device_id?: string | null;
  platform?: string | null;
  enabled?: boolean | null;
  last_seen_at?: string | null;
  name?: string | null;
  email?: string | null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR');
};

const formatQuietHours = (quiet?: { start?: string; end?: string } | null) => {
  if (!quiet?.start && !quiet?.end) return '-';
  const start = quiet?.start ?? '--:--';
  const end = quiet?.end ?? '--:--';
  return `${start}-${end}`;
};

const formatTopics = (topics?: string[] | null) => {
  if (!topics || topics.length === 0) return 'all';
  return topics.join(', ');
};

const maskToken = (token?: string | null) => {
  if (!token) return '-';
  if (token.length <= 12) return token;
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
};

const resolveUserLabel = (row: { name?: string | null; email?: string | null; user_id: string }) =>
  row.name || row.email || row.user_id;

export default function NotificationsAdminPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [devices, setDevices] = useState<NotificationDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [logsRes, prefsRes, devicesRes] = await Promise.all([
        apiGet<ApiResponse<NotificationLog[]>>('/admin/notifications/logs?limit=120'),
        apiGet<ApiResponse<NotificationPreference[]>>('/admin/notifications/preferences'),
        apiGet<ApiResponse<NotificationDevice[]>>('/admin/notifications/devices'),
      ]);
      setLogs(logsRes.data ?? []);
      setPreferences(prefsRes.data ?? []);
      setDevices(devicesRes.data ?? []);
    } catch (err) {
      setMessage('Falha ao carregar notificacoes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((log) => log.status === 'sent').length;
    const queued = logs.filter((log) => log.status === 'queued').length;
    const skipped = logs.filter((log) => log.status === 'skipped').length;
    const failed = logs.filter((log) => log.status === 'failed').length;

    return [
      {
        label: 'Logs',
        value: total,
        helper: 'Ultimos envios',
        icon: Bell,
        tone: 'blue' as const,
      },
      {
        label: 'Enviadas',
        value: sent,
        helper: 'Status sent',
        icon: CheckCircle2,
        tone: 'green' as const,
      },
      {
        label: 'Em fila',
        value: queued,
        helper: 'Status queued',
        icon: Clock,
        tone: 'purple' as const,
      },
      {
        label: 'Falhas',
        value: failed + skipped,
        helper: 'Failed + skipped',
        icon: XCircle,
        tone: 'orange' as const,
      },
    ];
  }, [logs]);

  const statusClass = (status: string) => {
    if (status === 'sent') return 'bg-emerald-50 text-emerald-600';
    if (status === 'queued') return 'bg-amber-50 text-amber-600';
    if (status === 'skipped') return 'bg-slate-100 text-slate-600';
    if (status === 'failed') return 'bg-rose-50 text-rose-600';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-primary-600">Notificacoes</p>
          <h1 className="text-2xl font-semibold text-slate-900">Envios e preferencias</h1>
          <p className="text-sm text-slate-500">
            {preferences.length} preferencias, {devices.length} dispositivos
          </p>
        </div>
        <Button variant="outline" onClick={loadData} loading={loading}>
          Atualizar
        </Button>
      </header>

      {message && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            helper={stat.helper}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg" className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary-600">Logs</p>
            <h2 className="text-xl font-semibold text-slate-900">Historico recente</h2>
          </div>
          <DataTable
            headers={[
              { key: 'user', label: 'Usuario' },
              { key: 'event', label: 'Evento' },
              { key: 'channel', label: 'Canal' },
              { key: 'status', label: 'Status', align: 'center' },
              { key: 'created', label: 'Criado', align: 'right' },
            ]}
          >
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Nenhum log encontrado.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{resolveUserLabel(log)}</p>
                  <p className="text-xs text-slate-500">{log.email ?? log.user_id}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-slate-900">{log.event_type}</p>
                  <p className="text-xs text-slate-500 max-w-[240px] truncate">{log.title ?? '-'}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{log.channel}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-500">{formatDateTime(log.created_at)}</td>
              </tr>
            ))}
          </DataTable>
        </Card>

        <Card padding="lg" className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary-600">Preferencias</p>
            <h2 className="text-xl font-semibold text-slate-900">Configuracoes por canal</h2>
          </div>
          <DataTable
            headers={[
              { key: 'user', label: 'Usuario' },
              { key: 'channel', label: 'Canal' },
              { key: 'enabled', label: 'Ativo', align: 'center' },
              { key: 'limit', label: 'Limite/dia', align: 'center' },
              { key: 'quiet', label: 'Quiet hours', align: 'center' },
            ]}
          >
            {preferences.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Nenhuma preferencia encontrada.
                </td>
              </tr>
            )}
            {preferences.map((pref) => (
              <tr key={`${pref.user_id}-${pref.channel}`}>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{resolveUserLabel(pref)}</p>
                  <p className="text-xs text-slate-500">{pref.email ?? pref.user_id}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{pref.channel}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-600">{pref.enabled ? 'sim' : 'nao'}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-600">{pref.max_per_day ?? '-'}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-600">{formatQuietHours(pref.quiet_hours)}</td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </section>

      <section>
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-600">Dispositivos</p>
              <h2 className="text-xl font-semibold text-slate-900">Tokens registrados</h2>
            </div>
          </div>
          <DataTable
            headers={[
              { key: 'user', label: 'Usuario' },
              { key: 'provider', label: 'Provider' },
              { key: 'platform', label: 'Platform' },
              { key: 'token', label: 'Token' },
              { key: 'seen', label: 'Last seen', align: 'right' },
            ]}
          >
            {devices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Nenhum dispositivo encontrado.
                </td>
              </tr>
            )}
            {devices.map((device) => (
              <tr key={`${device.user_id}-${device.provider}-${device.token}`}>
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{resolveUserLabel(device)}</p>
                  <p className="text-xs text-slate-500">{device.email ?? device.user_id}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{device.provider}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{device.platform ?? '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{maskToken(device.token)}</td>
                <td className="px-4 py-3 text-right text-xs text-slate-500">
                  {formatDateTime(device.last_seen_at)}
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-600">Detalhes</p>
              <h2 className="text-xl font-semibold text-slate-900">Resumo rapido</h2>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Preferencias com topics: {preferences.filter((pref) => pref.topics && pref.topics.length > 0).length}</p>
            <p>Tokens ativos: {devices.length}</p>
            <p>Ultima atualizacao: {formatDateTime(logs[0]?.created_at ?? null)}</p>
          </div>
        </Card>

        <Card padding="lg">
          <div>
            <p className="text-sm font-semibold text-primary-600">Observacoes</p>
            <h2 className="text-xl font-semibold text-slate-900">Topics e regras</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Topics por preferencia: {preferences.map((pref) => formatTopics(pref.topics)).join(' | ') || '-'}</p>
            <p>Ultimos logs exibem ate 120 registros.</p>
            <p>Dispositivos mostram tokens mascarados por seguranca.</p>
          </div>
        </Card>
      </section>
    </div>
  );
}
