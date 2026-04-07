'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher, apiPost, apiPatch } from '@/lib/api';
import clsx from 'clsx';

// ── Types ────────────────────────────────────────────────────────────────────

type Briefing = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  client_name: string | null;
  payload: Record<string, any> | null;
  copy_approved_at: string | null;
  copy_approval_comment: string | null;
};

type CopyVersion = {
  id: string;
  output: string;
  model: string | null;
  status: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  display_name: string;
  active_timers?: { briefing_id: string; briefing_title?: string; started_at: string }[];
};

// ── Timer hook ───────────────────────────────────────────────────────────────

function useElapsed(startedAt: string | null) {
  const [secs, setSecs] = useState(
    startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0,
  );
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setSecs((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ── Char count helpers ───────────────────────────────────────────────────────

const PLATFORM_LIMITS: Record<string, number> = {
  instagram: 2200,
  linkedin: 3000,
  twitter: 280,
  x: 280,
  facebook: 63206,
  tiktok: 2200,
};

function getLimit(platform?: string) {
  if (!platform) return null;
  return PLATFORM_LIMITS[platform.toLowerCase()] ?? null;
}

// ── Brief context panel ──────────────────────────────────────────────────────

const SKIP_KEYS = new Set(['client_id', 'tenant_id', 'briefing_id', 'clientId', 'client_ref']);

const FIELD_LABELS: Record<string, string> = {
  platform: 'Plataforma',
  format: 'Formato',
  objective: 'Objetivo',
  persona: 'Persona',
  tone: 'Tom de voz',
  cta: 'CTA',
  event: 'Evento',
  date: 'Data',
  notes: 'Observações',
  momento_consciencia: 'Momento de consciência',
  target_audience: 'Público-alvo',
  key_message: 'Mensagem-chave',
};

function BriefPanel({ briefing }: { briefing: Briefing }) {
  const payload = briefing.payload ?? {};
  const entries = Object.entries(payload)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && v && String(v).length > 0)
    .slice(0, 20);

  return (
    <div className="studio-brief-panel">
      <div className="studio-panel-header">
        <span className="portal-kicker">Brief</span>
        <h3 className="studio-panel-title">{briefing.title}</h3>
        <p className="portal-card-subtitle">{briefing.client_name ?? 'Cliente não informado'}</p>
        {briefing.due_at && (
          <p className="portal-card-subtitle" style={{ marginTop: 4 }}>
            Prazo: {new Date(briefing.due_at).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}
          </p>
        )}
        {briefing.copy_approved_at && (
          <div className="portal-alert portal-alert-success" style={{ marginTop: 12, padding: '8px 12px' }}>
            Copy aprovada em {new Date(briefing.copy_approved_at).toLocaleDateString('pt-BR')}
            {briefing.copy_approval_comment && (
              <p style={{ marginTop: 4, opacity: 0.85 }}>{briefing.copy_approval_comment}</p>
            )}
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="studio-brief-fields">
          {entries.map(([key, value]) => (
            <div key={key} className="studio-brief-field">
              <span className="studio-brief-label">
                {FIELD_LABELS[key] ?? key.replace(/_/g, ' ')}
              </span>
              <span className="studio-brief-value">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Timer panel ──────────────────────────────────────────────────────────────

function TimerPanel({ briefingId, profile, onRefresh }: {
  briefingId: string;
  profile: Profile;
  onRefresh: () => void;
}) {
  const activeTimer = profile.active_timers?.find((t) => t.briefing_id === briefingId) ?? null;
  const elapsed = useElapsed(activeTimer?.started_at ?? null);
  const [loading, setLoading] = useState(false);
  const [desc, setDesc] = useState('');
  const [stopping, setStopping] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      await apiPost('/freelancers/timer/start', { freelancer_id: profile.id, briefing_id: briefingId });
      onRefresh();
    } finally { setLoading(false); }
  };

  const stop = async () => {
    setLoading(true);
    try {
      await apiPost('/freelancers/timer/stop', {
        freelancer_id: profile.id,
        briefing_id: briefingId,
        description: desc.trim() || null,
      });
      setStopping(false);
      setDesc('');
      onRefresh();
    } finally { setLoading(false); }
  };

  return (
    <div className="studio-timer-panel">
      <div className="studio-panel-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="studio-panel-label">Tempo</span>
        {activeTimer && (
          <span className="portal-pill portal-pill-success" style={{ fontSize: '0.7rem' }}>● Rodando</span>
        )}
      </div>

      {activeTimer ? (
        <div className="studio-timer-running">
          <div className="studio-timer-display">{elapsed}</div>
          {!stopping ? (
            <button onClick={() => setStopping(true)} className="portal-button-danger" style={{ width: '100%', padding: '8px' }}>
              Parar timer
            </button>
          ) : (
            <>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="O que foi executado? (opcional)"
                rows={2}
                className="portal-textarea"
                style={{ fontSize: '0.8rem' }}
              />
              <div className="portal-inline-stack" style={{ gap: 8 }}>
                <button onClick={() => setStopping(false)} className="portal-button-ghost" style={{ flex: 1, padding: '8px' }}>Cancelar</button>
                <button onClick={stop} disabled={loading} className="portal-button-danger" style={{ flex: 1, padding: '8px' }}>
                  {loading ? '...' : 'Confirmar'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button onClick={start} disabled={loading} className="portal-button" style={{ width: '100%', padding: '8px' }}>
          {loading ? 'Iniciando...' : 'Iniciar timer'}
        </button>
      )}
    </div>
  );
}

// ── Version history ──────────────────────────────────────────────────────────

function VersionHistory({ versions, onSelect, selectedId }: {
  versions: CopyVersion[];
  onSelect: (v: CopyVersion) => void;
  selectedId?: string;
}) {
  if (!versions.length) return (
    <div className="studio-versions-empty">
      <p className="portal-card-subtitle">Sem versões ainda.</p>
    </div>
  );

  return (
    <div className="studio-versions-list">
      {versions.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelect(v)}
          className={clsx('studio-version-item', v.id === selectedId && 'studio-version-item-active')}
        >
          <div className="studio-version-meta">
            <span className="studio-version-model">{v.model === 'manual' ? 'Manual' : (v.model ?? 'IA')}</span>
            <span className="studio-version-date">
              {new Date(v.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="studio-version-preview">
            {v.output.slice(0, 80)}{v.output.length > 80 ? '…' : ''}
          </p>
          {v.status === 'selected' && (
            <span className="portal-pill portal-pill-success" style={{ fontSize: '0.6rem', marginTop: 4 }}>Selecionada</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StudioEditorPage({ params }: { params: Promise<{ briefingId: string }> }) {
  const { briefingId } = use(params);
  const router = useRouter();

  const { data, isLoading, mutate } = useSWR<{ briefing: Briefing; versions: CopyVersion[] }>(
    `/freelancers/portal/me/studio/${briefingId}`,
    swrFetcher,
  );
  const { data: profile, mutate: mutateProfile } = useSWR<Profile>(
    '/freelancers/portal/me',
    swrFetcher,
  );

  const briefing = data?.briefing;
  const versions = useMemo(() => data?.versions ?? [], [data?.versions]);

  // Editor state
  const [draft, setDraft] = useState('');
  const [activeVersionId, setActiveVersionId] = useState<string | undefined>();
  const [tab, setTab] = useState<'editor' | 'versions' | 'brief'>('editor');

  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [genInstructions, setGenInstructions] = useState('');
  const [genError, setGenError] = useState('');

  // Save state
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitDone, setSubmitDone] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const platform = briefing?.payload?.platform as string | undefined;
  const charLimit = getLimit(platform);
  const charCount = draft.length;

  // Load most recent version into editor on mount
  useEffect(() => {
    if (versions.length && !draft && !activeVersionId) {
      const latest = versions[0];
      setDraft(latest.output);
      setActiveVersionId(latest.id);
    }
  }, [versions, draft, activeVersionId]);

  const handleSelectVersion = useCallback((v: CopyVersion) => {
    setDraft(v.output);
    setActiveVersionId(v.id);
    setTab('editor');
  }, []);

  const handleGenerate = async () => {
    if (!briefing) return;
    setGenerating(true);
    setGenError('');
    try {
      const result = await apiPost<{ version: CopyVersion }>(
        `/freelancers/portal/me/studio/${briefingId}/generate`,
        { instructions: genInstructions.trim() || undefined, platform },
      );
      await mutate();
      setDraft(result.version.output);
      setActiveVersionId(result.version.id);
      setGenInstructions('');
      setTab('editor');
    } catch (err: any) {
      setGenError(err.message || 'Erro na geração.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const result = await apiPatch<{ version: CopyVersion }>(
        `/freelancers/portal/me/studio/${briefingId}/copy`,
        { output: draft, versionId: activeVersionId },
      );
      await mutate();
      setActiveVersionId(result.version.id);
      setSavedMsg('Salvo!');
      setTimeout(() => setSavedMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeVersionId) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await apiPost(`/freelancers/portal/me/studio/${briefingId}/submit`, {
        versionId: activeVersionId,
        notes: submitNotes.trim() || undefined,
      });
      setSubmitDone(true);
      setShowSubmitConfirm(false);
      await mutate();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao enviar para revisão.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (draft) navigator.clipboard.writeText(draft).catch(() => {});
  };

  if (isLoading || !profile) {
    return (
      <div className="portal-empty">
        <p className="portal-card-subtitle">Carregando studio...</p>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="portal-page">
        <div className="portal-alert portal-alert-error">Briefing não encontrado ou não atribuído a você.</div>
        <button className="portal-button-ghost" onClick={() => router.push('/studio')}>← Voltar</button>
      </div>
    );
  }

  return (
    <div className="studio-layout">

      {/* ── Left: Brief context ──────────────────────────────────────── */}
      <aside className="studio-sidebar">
        <BriefPanel briefing={briefing} />
        <TimerPanel briefingId={briefingId} profile={profile} onRefresh={() => mutateProfile()} />
      </aside>

      {/* ── Center: Editor + AI ──────────────────────────────────────── */}
      <main className="studio-main">
        {/* Top bar */}
        <div className="studio-topbar">
          <button className="portal-button-ghost studio-back-btn" onClick={() => router.push('/studio')}>
            ← Studio
          </button>
          <div className="studio-tabs">
            {(['editor', 'versions'] as const).map((t) => (
              <button
                key={t}
                className={clsx('studio-tab', tab === t && 'studio-tab-active')}
                onClick={() => setTab(t)}
              >
                {t === 'editor' ? 'Editor' : `Histórico (${versions.length})`}
              </button>
            ))}
          </div>
          <div className="studio-topbar-actions">
            {savedMsg && <span className="studio-saved-badge">{savedMsg}</span>}
            <button onClick={copyToClipboard} className="portal-button-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Copiar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="portal-button"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Editor */}
        {tab === 'editor' && (
          <div className="studio-editor-area">
            {submitDone ? (
              <div className="portal-alert portal-alert-success" style={{ margin: 24 }}>
                Copy enviada para revisão com sucesso!
              </div>
            ) : null}

            <div className="studio-editor-wrapper">
              <textarea
                className="studio-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escreva ou gere o texto aqui..."
                spellCheck
              />
              <div className="studio-editor-footer">
                <span className={clsx('studio-char-count', charLimit && charCount > charLimit && 'studio-char-over')}>
                  {charCount}{charLimit ? ` / ${charLimit}` : ''} caracteres
                  {platform && <span style={{ marginLeft: 8, opacity: 0.5 }}>{platform.toUpperCase()}</span>}
                </span>
                {!submitDone && (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    disabled={!activeVersionId || !draft.trim()}
                    className="studio-submit-btn"
                  >
                    Enviar para revisão →
                  </button>
                )}
              </div>
            </div>

            {/* Submit confirm */}
            {showSubmitConfirm && (
              <div className="studio-submit-confirm">
                <p className="portal-card-title" style={{ marginBottom: 8 }}>Confirmar envio para revisão</p>
                <p className="portal-card-subtitle" style={{ marginBottom: 12 }}>
                  A copy selecionada será marcada como pronta e o briefing avançará para revisão.
                </p>
                <textarea
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="Nota para o revisor (opcional)"
                  rows={2}
                  className="portal-textarea"
                />
                {submitError && (
                  <div className="portal-alert portal-alert-error" style={{ marginTop: 8 }}>
                    {submitError}
                  </div>
                )}
                <div className="portal-inline-stack" style={{ marginTop: 12 }}>
                  <button onClick={() => setShowSubmitConfirm(false)} className="portal-button-ghost">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} disabled={submitting} className="portal-button">
                    {submitting ? 'Enviando...' : 'Confirmar envio'}
                  </button>
                </div>
              </div>
            )}

            {/* AI generation panel */}
            <div className="studio-ai-panel">
              <div className="studio-ai-header">
                <span className="studio-panel-label">Geração com IA</span>
              </div>
              {genError && (
                <div className="portal-alert portal-alert-error" style={{ marginBottom: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
                  {genError}
                </div>
              )}
              <textarea
                value={genInstructions}
                onChange={(e) => setGenInstructions(e.target.value)}
                placeholder="Instrução adicional (tom, CTA, ângulo específico...)"
                rows={2}
                className="portal-textarea"
                style={{ fontSize: '0.85rem' }}
              />
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={clsx('studio-gen-btn', generating && 'studio-gen-btn-loading')}
              >
                {generating ? (
                  <>
                    <span className="studio-spinner" />
                    Gerando...
                  </>
                ) : (
                  <>✦ Gerar com IA</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Version history */}
        {tab === 'versions' && (
          <div className="studio-versions-area">
            <p className="portal-card-subtitle" style={{ padding: '12px 20px', borderBottom: '1px solid var(--portal-border)' }}>
              Clique em uma versão para abri-la no editor.
            </p>
            <VersionHistory
              versions={versions}
              onSelect={handleSelectVersion}
              selectedId={activeVersionId}
            />
          </div>
        )}
      </main>
    </div>
  );
}
