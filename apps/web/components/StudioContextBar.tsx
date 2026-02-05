'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  city?: string | null;
  uf?: string | null;
};

type StoredClient = {
  id: string;
  name: string;
  segment?: string | null;
  city?: string | null;
  uf?: string | null;
};

type StudioContext = {
  event?: string;
  date?: string;
  client?: string;
  clientId?: string;
  segment?: string;
};

const readContext = (): StudioContext => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem('edro_studio_context');
    if (!raw) return {};
    return JSON.parse(raw) as StudioContext;
  } catch {
    return {};
  }
};

const readSelectedClients = (): StoredClient[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('edro_selected_clients');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSelectedClients = (clients: StoredClient[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('edro_selected_clients', JSON.stringify(clients));
};

const readActiveClientId = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('edro_active_client_id') || '';
};

const writeActiveClientId = (id: string) => {
  if (typeof window === 'undefined') return;
  if (id) {
    window.localStorage.setItem('edro_active_client_id', id);
  } else {
    window.localStorage.removeItem('edro_active_client_id');
  }
};

const updateContextClient = (client?: StoredClient | null) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('edro_studio_context');
    const context = raw ? JSON.parse(raw) : {};
    context.client = client?.name || '';
    context.clientId = client?.id || '';
    context.segment = client?.segment || '';
    window.localStorage.setItem('edro_studio_context', JSON.stringify(context));
  } catch {
    // ignore
  }
};

const emitContextChange = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('edro-studio-context-change'));
};

type StudioContextBarProps = {
  variant?: 'default' | 'compact';
};

export default function StudioContextBar({ variant = 'default' }: StudioContextBarProps) {
  const [context, setContext] = useState<StudioContext>({});
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selected, setSelected] = useState<StoredClient[]>([]);
  const [activeClientId, setActiveClientId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = () => {
      setContext(readContext());
      setSelected(readSelectedClients());
      setActiveClientId(readActiveClientId());
    };

    refresh();

    if (typeof window !== 'undefined') {
      window.addEventListener('edro-studio-context-change', refresh);
    }

    apiGet<ClientRow[]>('/clients')
      .then((response) => {
        setClients(response || []);
      })
      .catch(() => {
        setClients([]);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('edro-studio-context-change', refresh);
      }
    };
  }, []);

  useEffect(() => {
    if (!selected.length && context?.clientId && context?.client) {
      const fallback: StoredClient = {
        id: context.clientId,
        name: context.client,
        segment: context.segment || null,
      };
      setSelected([fallback]);
      writeSelectedClients([fallback]);
      setActiveClientId(context.clientId);
      writeActiveClientId(context.clientId);
    }
  }, [context, selected.length]);

  const activeClient = useMemo(
    () => selected.find((client) => client.id === activeClientId) || selected[0] || null,
    [selected, activeClientId]
  );

  useEffect(() => {
    if (activeClient?.id && activeClient.id !== activeClientId) {
      setActiveClientId(activeClient.id);
      writeActiveClientId(activeClient.id);
    }
  }, [activeClient, activeClientId]);

  const handleSelectClient = (clientId: string) => {
    const match = clients.find((client) => client.id === clientId);
    if (!match) return;
    const exists = selected.some((client) => client.id === match.id);
    if (exists) return;
    const next = [
      ...selected,
      {
        id: match.id,
        name: match.name,
        segment: match.segment_primary || null,
        city: match.city || null,
        uf: match.uf || null,
      },
    ];
    setSelected(next);
    writeSelectedClients(next);
    emitContextChange();
    if (!activeClientId) {
      setActiveClientId(match.id);
      writeActiveClientId(match.id);
      updateContextClient({
        id: match.id,
        name: match.name,
        segment: match.segment_primary || null,
        city: match.city || null,
        uf: match.uf || null,
      });
      emitContextChange();
    }
  };

  const handleRemoveClient = (clientId: string) => {
    const next = selected.filter((client) => client.id !== clientId);
    setSelected(next);
    writeSelectedClients(next);
    emitContextChange();
    if (clientId === activeClientId) {
      const nextActive = next[0]?.id || '';
      setActiveClientId(nextActive);
      writeActiveClientId(nextActive);
      const nextClient = next[0] || null;
      updateContextClient(nextClient);
      emitContextChange();
    }
  };

  const handleSelectAll = () => {
    if (!clients.length) return;
    const next = clients.map((client) => ({
      id: client.id,
      name: client.name,
      segment: client.segment_primary || null,
      city: client.city || null,
      uf: client.uf || null,
    }));
    setSelected(next);
    writeSelectedClients(next);
    emitContextChange();
    if (!activeClientId && next.length) {
      setActiveClientId(next[0].id);
      writeActiveClientId(next[0].id);
      updateContextClient(next[0]);
      emitContextChange();
    }
  };

  const handleClear = () => {
    setSelected([]);
    writeSelectedClients([]);
    setActiveClientId('');
    writeActiveClientId('');
    updateContextClient(null);
    emitContextChange();
  };

  const eventLabel = context?.event || 'Sem evento selecionado';
  const dateLabel = context?.date || 'Sem data';

  if (variant === 'compact') {
    return (
      <div className="studio-context-bar compact">
        <div className="studio-context-inline-event">
          <span className="studio-context-label">Evento</span>
          <span className="studio-context-value">{eventLabel}</span>
          <span className="studio-context-sub">{dateLabel}</span>
        </div>
        <div className="studio-context-inline-clients">
          <div className="studio-context-chips">
            {selected.length ? (
              selected.map((client) => (
                <div key={client.id} className="studio-context-chip">
                  <span>{client.name}</span>
                  <button
                    type="button"
                    className="studio-context-chip-remove"
                    onClick={() => handleRemoveClient(client.id)}
                    aria-label={`Remover ${client.name}`}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <span className="studio-context-empty">Nenhum cliente</span>
            )}
          </div>
          <div className="studio-context-actions">
            <select
              className="edro-select"
              onChange={(event) => {
                if (event.target.value) {
                  handleSelectClient(event.target.value);
                  event.target.value = '';
                }
              }}
              value=""
              disabled={loading}
            >
              <option value="">Adicionar cliente</option>
              {clients
                .filter((client) => !selected.some((item) => item.id === client.id))
                .map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
            </select>
            <button className="btn ghost" type="button" onClick={handleSelectAll} disabled={loading}>
              Todos
            </button>
            <button className="btn ghost" type="button" onClick={handleClear} disabled={loading}>
              Limpar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-context-bar">
      <div className="studio-context-block">
        <div className="studio-context-label">Evento</div>
        <div className="studio-context-value">{eventLabel}</div>
        <div className="studio-context-sub">{dateLabel}</div>
      </div>
      <div className="studio-context-block">
        <div className="studio-context-label">Clientes do job</div>
        <div className="studio-context-chips">
          {selected.length ? (
            selected.map((client) => (
              <div key={client.id} className="studio-context-chip">
                <span>{client.name}</span>
                <button
                  type="button"
                  className="studio-context-chip-remove"
                  onClick={() => handleRemoveClient(client.id)}
                  aria-label={`Remover ${client.name}`}
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <span className="studio-context-empty">Nenhum cliente selecionado</span>
          )}
        </div>
        <div className="studio-context-actions">
          <select
            className="edro-select"
            onChange={(event) => {
              if (event.target.value) {
                handleSelectClient(event.target.value);
                event.target.value = '';
              }
            }}
            value=""
            disabled={loading}
          >
            <option value="">Adicionar cliente</option>
            {clients
              .filter((client) => !selected.some((item) => item.id === client.id))
              .map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
          </select>
          <button className="btn ghost" type="button" onClick={handleSelectAll} disabled={loading}>
            Selecionar todos
          </button>
          <button className="btn ghost" type="button" onClick={handleClear} disabled={loading}>
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
