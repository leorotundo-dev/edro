'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

type Briefing = {
  id: string;
  title: string;
  client_name?: string | null;
  status: string;
  current_stage?: string | null;
  payload?: Record<string, any> | null;
  due_at?: string | null;
  meeting_url?: string | null;
  traffic_owner?: string | null;
  created_at?: string | null;
};

type BriefingDetail = {
  briefing: Briefing;
  stages: Array<{ stage: string; status: string }>;
  copies: Array<{ id: string; output: string; created_at: string }>;
  tasks: Array<{ id: string; type: string; status: string; assigned_to?: string | null }>;
};

type WorkflowStage = string;

type UserInfo = {
  email?: string;
  role?: string;
};

const STAGE_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovacao',
  producao: 'Producao',
  revisao: 'Revisao',
  entrega: 'Entrega',
  iclips_out: 'iClips saida',
  done: 'Concluido',
};

const defaultBriefingForm = {
  clientName: '',
  title: '',
  trafficOwner: '',
  meetingUrl: '',
  dueAt: '',
  briefingText: '',
  deliverables: '',
  channels: '',
  references: '',
  notes: '',
  notifyTraffic: true,
};

function formatDate(value?: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem prazo';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Drawer({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className={`drawer ${open ? 'open' : ''}`}>
      <div className="drawer-header">
        <h3>{title}</h3>
        <button className="btn ghost" type="button" onClick={onClose}>
          Fechar
        </button>
      </div>
      <div className="drawer-body">{children}</div>
    </div>
  );
}

export default function BoardPage() {
  const router = useRouter();
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<UserInfo>({});

  const [showNewBriefing, setShowNewBriefing] = useState(false);
  const [newBriefing, setNewBriefing] = useState(defaultBriefingForm);

  const [copyTarget, setCopyTarget] = useState<Briefing | null>(null);
  const [copyLanguage, setCopyLanguage] = useState('pt');
  const [copyCount, setCopyCount] = useState(10);
  const [copyInstructions, setCopyInstructions] = useState('');

  const [assignTarget, setAssignTarget] = useState<Briefing | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [assignMessage, setAssignMessage] = useState('');

  const [detailTarget, setDetailTarget] = useState<BriefingDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const boardStages = useMemo(() => [...stages, 'done'], [stages]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('edro_token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }

    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('edro_user') : null;
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser({});
      }
    }

    loadBoard();
  }, [router]);

  const loadBoard = async () => {
    setLoading(true);
    setError('');
    try {
      const workflowResponse = await apiGet('/edro/workflow');
      const workflowStages = workflowResponse?.data || [];
      setStages(workflowStages);

      const briefsResponse = await apiGet('/edro/briefings');
      setBriefings(briefsResponse?.data || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar o quadro.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvance = async (briefing: Briefing) => {
    if (!briefing.current_stage) return;
    setError('');
    try {
      await apiPatch(`/edro/briefings/${briefing.id}/stages/${briefing.current_stage}`, {
        status: 'done',
      });
      await loadBoard();
    } catch (err: any) {
      setError(err?.message || 'Falha ao avancar etapa.');
    }
  };

  const handleGenerateCopy = async () => {
    if (!copyTarget) return;
    setError('');
    try {
      await apiPost(`/edro/briefings/${copyTarget.id}/copy`, {
        language: copyLanguage,
        count: copyCount,
        instructions: copyInstructions,
      });
      setCopyTarget(null);
      setCopyInstructions('');
      await loadBoard();
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar copy.');
    }
  };

  const handleAssignDa = async () => {
    if (!assignTarget) return;
    setError('');
    if (!assignTo.trim()) {
      setError('Informe o responsavel antes de enviar o job.');
      return;
    }
    try {
      await apiPost(`/edro/briefings/${assignTarget.id}/assign-da`, {
        assigned_to: assignTo,
        channels: ['whatsapp', 'email'],
        message: assignMessage,
      });
      setAssignTarget(null);
      setAssignMessage('');
      setAssignTo('');
      await loadBoard();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atribuir DA.');
    }
  };

  const handleNewBriefing = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await apiPost('/edro/briefings', {
        client_name: newBriefing.clientName,
        title: newBriefing.title,
        traffic_owner: newBriefing.trafficOwner || undefined,
        meeting_url: newBriefing.meetingUrl || undefined,
        due_at: newBriefing.dueAt || undefined,
        notify_traffic: newBriefing.notifyTraffic,
        traffic_recipient: newBriefing.trafficOwner || undefined,
        payload: {
          briefing: newBriefing.briefingText,
          deliverables: newBriefing.deliverables,
          channels: newBriefing.channels,
          references: newBriefing.references,
          notes: newBriefing.notes,
        },
      });
      setShowNewBriefing(false);
      setNewBriefing(defaultBriefingForm);
      await loadBoard();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar briefing.');
    }
  };

  const openDetail = async (briefing: Briefing) => {
    setError('');
    try {
      const response = await apiGet(`/edro/briefings/${briefing.id}`);
      setDetailTarget(response?.data || null);
      setDetailOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar detalhe.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('edro_token');
    localStorage.removeItem('edro_user');
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="pulse">Carregando quadro...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-kicker">Edro Digital</span>
          <h1 className="brand">Control Room</h1>
          <div className="subtitle">Fluxo interno da agencia</div>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost" type="button" onClick={() => setShowNewBriefing(true)}>
            Novo briefing
          </button>
          <div className="user-chip">
            <span>{user.email || 'edro.digital'}</span>
            <small>{user.role || 'time interno'}</small>
          </div>
          <button className="btn outline" type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {error ? <div className="notice error">{error}</div> : null}

      <main className="board">
        {boardStages.map((stage) => {
          const items = briefings.filter((briefing) => (briefing.current_stage || briefing.status) === stage);
          return (
            <section className="column" key={stage} data-stage={stage}>
              <div className="column-header">
                <h2>{STAGE_LABELS[stage] || stage}</h2>
                <span>{items.length}</span>
              </div>
              <div className="column-body">
                {items.length === 0 ? (
                  <div className="empty">Sem itens</div>
                ) : (
                  items.map((briefing) => (
                    <article className="card" key={briefing.id}>
                      <div className="card-title">
                        <div>
                          <h3>{briefing.title}</h3>
                          <p>{briefing.client_name || 'Cliente sem nome'}</p>
                        </div>
                        <span className="chip">{formatDate(briefing.due_at)}</span>
                      </div>
                      <p className="card-text">
                        {briefing.payload?.briefing || briefing.payload?.objective || 'Sem resumo'}
                      </p>
                      <div className="card-actions">
                        <button className="btn ghost" type="button" onClick={() => openDetail(briefing)}>
                          Detalhes
                        </button>
                        {stage === 'copy_ia' ? (
                          <button
                            className="btn primary"
                            type="button"
                            onClick={() => setCopyTarget(briefing)}
                          >
                            Gerar copy
                          </button>
                        ) : stage === 'producao' ? (
                          <>
                            <button
                              className="btn ghost"
                              type="button"
                              onClick={() => setAssignTarget(briefing)}
                            >
                              Atribuir DA
                            </button>
                            <button className="btn primary" type="button" onClick={() => handleAdvance(briefing)}>
                              Concluir
                            </button>
                          </>
                        ) : stage === 'done' ? null : (
                          <button className="btn primary" type="button" onClick={() => handleAdvance(briefing)}>
                            Concluir
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>

      <Modal open={showNewBriefing} title="Novo briefing" onClose={() => setShowNewBriefing(false)}>
        <form className="form-grid" onSubmit={handleNewBriefing}>
          <label className="field">
            <span>Cliente</span>
            <input
              value={newBriefing.clientName}
              onChange={(event) => setNewBriefing({ ...newBriefing, clientName: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Titulo</span>
            <input
              value={newBriefing.title}
              onChange={(event) => setNewBriefing({ ...newBriefing, title: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Responsavel trafego</span>
            <input
              value={newBriefing.trafficOwner}
              onChange={(event) => setNewBriefing({ ...newBriefing, trafficOwner: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Link Gather</span>
            <input
              value={newBriefing.meetingUrl}
              onChange={(event) => setNewBriefing({ ...newBriefing, meetingUrl: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Prazo</span>
            <input
              type="datetime-local"
              value={newBriefing.dueAt}
              onChange={(event) => setNewBriefing({ ...newBriefing, dueAt: event.target.value })}
            />
          </label>
          <label className="field full">
            <span>Briefing</span>
            <textarea
              rows={4}
              value={newBriefing.briefingText}
              onChange={(event) => setNewBriefing({ ...newBriefing, briefingText: event.target.value })}
            />
          </label>
          <label className="field full">
            <span>Entregas</span>
            <textarea
              rows={2}
              value={newBriefing.deliverables}
              onChange={(event) => setNewBriefing({ ...newBriefing, deliverables: event.target.value })}
            />
          </label>
          <label className="field full">
            <span>Canais</span>
            <input
              value={newBriefing.channels}
              onChange={(event) => setNewBriefing({ ...newBriefing, channels: event.target.value })}
            />
          </label>
          <label className="field full">
            <span>Referencias</span>
            <input
              value={newBriefing.references}
              onChange={(event) => setNewBriefing({ ...newBriefing, references: event.target.value })}
            />
          </label>
          <label className="field full">
            <span>Observacoes</span>
            <textarea
              rows={2}
              value={newBriefing.notes}
              onChange={(event) => setNewBriefing({ ...newBriefing, notes: event.target.value })}
            />
          </label>
          <label className="field checkbox">
            <input
              type="checkbox"
              checked={newBriefing.notifyTraffic}
              onChange={(event) => setNewBriefing({ ...newBriefing, notifyTraffic: event.target.checked })}
            />
            <span>Notificar trafego</span>
          </label>
          <div className="form-actions">
            <button className="btn ghost" type="button" onClick={() => setShowNewBriefing(false)}>
              Cancelar
            </button>
            <button className="btn primary" type="submit">
              Criar briefing
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!copyTarget}
        title={`Copy IA - ${copyTarget?.title || ''}`}
        onClose={() => setCopyTarget(null)}
      >
        <div className="form-grid">
          <label className="field">
            <span>Idioma</span>
            <select value={copyLanguage} onChange={(event) => setCopyLanguage(event.target.value)}>
              <option value="pt">Portugues</option>
              <option value="es">Espanhol</option>
            </select>
          </label>
          <label className="field">
            <span>Quantidade</span>
            <input
              type="number"
              min={1}
              max={20}
              value={copyCount}
              onChange={(event) => setCopyCount(Number(event.target.value))}
            />
          </label>
          <label className="field full">
            <span>Instrucoes adicionais</span>
            <textarea
              rows={3}
              value={copyInstructions}
              onChange={(event) => setCopyInstructions(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="btn ghost" type="button" onClick={() => setCopyTarget(null)}>
              Cancelar
            </button>
            <button className="btn primary" type="button" onClick={handleGenerateCopy}>
              Gerar copy
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!assignTarget}
        title={`Atribuir DA - ${assignTarget?.title || ''}`}
        onClose={() => setAssignTarget(null)}
      >
        <div className="form-grid">
          <label className="field full">
            <span>Responsavel (email ou nome)</span>
            <input
              value={assignTo}
              onChange={(event) => setAssignTo(event.target.value)}
              required
            />
          </label>
          <label className="field full">
            <span>Mensagem</span>
            <textarea
              rows={3}
              value={assignMessage}
              onChange={(event) => setAssignMessage(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="btn ghost" type="button" onClick={() => setAssignTarget(null)}>
              Cancelar
            </button>
            <button className="btn primary" type="button" onClick={handleAssignDa}>
              Enviar job
            </button>
          </div>
        </div>
      </Modal>

      <Drawer
        open={detailOpen}
        title={detailTarget?.briefing?.title || 'Detalhes'}
        onClose={() => setDetailOpen(false)}
      >
        {detailTarget ? (
          <div className="detail-grid">
            <section>
              <h4>Briefing</h4>
              <p><strong>Cliente:</strong> {detailTarget.briefing.client_name || 'Nao informado'}</p>
              <p><strong>Prazo:</strong> {formatDate(detailTarget.briefing.due_at)}</p>
              <p><strong>Link Gather:</strong> {detailTarget.briefing.meeting_url || 'Nao informado'}</p>
              <p className="detail-text">
                {detailTarget.briefing.payload?.briefing || 'Sem briefing detalhado.'}
              </p>
            </section>
            <section>
              <h4>Etapas</h4>
              <ul className="detail-list">
                {detailTarget.stages.map((stage) => (
                  <li key={stage.stage}>
                    <span>{STAGE_LABELS[stage.stage] || stage.stage}</span>
                    <span className={`status ${stage.status}`}>{stage.status}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h4>Copys</h4>
              {detailTarget.copies.length === 0 ? (
                <p>Sem copys ainda.</p>
              ) : (
                detailTarget.copies.map((copy) => (
                  <div className="copy-block" key={copy.id}>
                    <span>{new Date(copy.created_at).toLocaleString('pt-BR')}</span>
                    <pre>{copy.output}</pre>
                  </div>
                ))
              )}
            </section>
            <section>
              <h4>Tarefas</h4>
              <ul className="detail-list">
                {detailTarget.tasks.map((task) => (
                  <li key={task.id}>
                    <span>{task.type}</span>
                    <span>{task.assigned_to || 'Sem responsavel'}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
