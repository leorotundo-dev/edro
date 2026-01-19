'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Button, Badge } from '@edro/ui';
import { Bell, CheckCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Preference = {
  user_id: string;
  channel: 'push' | 'email' | 'inapp';
  enabled: boolean;
  quiet_hours?: { start?: string; end?: string } | null;
  max_per_day?: number | null;
  min_interval_minutes?: number | null;
  topics?: string[];
};

type InAppNotification = {
  id: string;
  title?: string;
  body?: string;
  created_at: string;
  read_at?: string | null;
  event_type?: string;
};

async function authFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token') || localStorage.getItem('edro_token')
    : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(`Erro ${res.status}`);
  }
  return res.json();
}

export default function NotificacoesPage() {
  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [prefRes, notifRes] = await Promise.all([
        authFetch('/api/notifications/preferences'),
        authFetch('/api/notifications/inapp'),
      ]);
      setPrefs(prefRes.data || []);
      setNotifications(notifRes.data || []);
    } catch {
      setMessage('Falha ao carregar notificacoes.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function savePreference(pref: Preference) {
    try {
      await authFetch('/api/notifications/preferences', {
        method: 'POST',
        body: JSON.stringify({
          channel: pref.channel,
          enabled: pref.enabled,
          quiet_hours: pref.quiet_hours ?? undefined,
          max_per_day: pref.max_per_day ?? undefined,
          min_interval_minutes: pref.min_interval_minutes ?? undefined,
          topics: pref.topics ?? [],
        }),
      });
      setMessage('Preferencia salva.');
      await loadData();
    } catch {
      setMessage('Nao foi possivel salvar.');
    }
  }

  async function markRead(id: string) {
    try {
      await authFetch(`/api/notifications/inapp/${id}/read`, { method: 'POST' });
      await loadData();
    } catch {
      setMessage('Nao foi possivel marcar como lida.');
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-7 w-7 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notificacoes</h1>
          <p className="text-slate-600">Preferencias e recados in-app.</p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {message}
        </div>
      )}

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Preferencias</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prefs.map((pref) => (
            <div key={pref.channel} className="rounded-xl border border-slate-100 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{pref.channel}</p>
                <label className="text-xs text-slate-600 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pref.enabled}
                    onChange={(e) =>
                      setPrefs((prev) =>
                        prev.map((item) =>
                          item.channel === pref.channel ? { ...item, enabled: e.target.checked } : item
                        )
                      )
                    }
                  />
                  ativo
                </label>
              </div>

              <div>
                <label className="text-xs text-slate-600">Quiet hours</label>
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    placeholder="22:00"
                    value={pref.quiet_hours?.start || ''}
                    onChange={(e) =>
                      setPrefs((prev) =>
                        prev.map((item) =>
                          item.channel === pref.channel
                            ? { ...item, quiet_hours: { ...item.quiet_hours, start: e.target.value } }
                            : item
                        )
                      )
                    }
                  />
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    placeholder="07:00"
                    value={pref.quiet_hours?.end || ''}
                    onChange={(e) =>
                      setPrefs((prev) =>
                        prev.map((item) =>
                          item.channel === pref.channel
                            ? { ...item, quiet_hours: { ...item.quiet_hours, end: e.target.value } }
                            : item
                        )
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  placeholder="max/dia"
                  type="number"
                  value={pref.max_per_day ?? ''}
                  onChange={(e) =>
                    setPrefs((prev) =>
                      prev.map((item) =>
                        item.channel === pref.channel
                          ? { ...item, max_per_day: e.target.value ? Number(e.target.value) : null }
                          : item
                      )
                    )
                  }
                />
                <input
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  placeholder="intervalo (min)"
                  type="number"
                  value={pref.min_interval_minutes ?? ''}
                  onChange={(e) =>
                    setPrefs((prev) =>
                      prev.map((item) =>
                        item.channel === pref.channel
                          ? { ...item, min_interval_minutes: e.target.value ? Number(e.target.value) : null }
                          : item
                      )
                    )
                  }
                />
              </div>

              <Button size="sm" onClick={() => savePreference(pref)}>
                Salvar
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Inbox</h3>
        {notifications.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma notificacao in-app.</p>
        )}
        <div className="space-y-3">
          {notifications.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{item.title || 'Notificacao'}</p>
                {item.read_at ? (
                  <Badge variant="success">Lida</Badge>
                ) : (
                  <Badge variant="warning">Nova</Badge>
                )}
              </div>
              <p className="text-sm text-slate-600">{item.body}</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{new Date(item.created_at).toLocaleString('pt-BR')}</span>
                {!item.read_at && (
                  <Button size="sm" variant="outline" onClick={() => markRead(item.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como lida
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
