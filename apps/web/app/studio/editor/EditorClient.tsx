'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PostVersionHistory from '@/components/PostVersionHistory';
import { apiGet, apiPost } from '@/lib/api';

type CopyVersion = {
  id: string;
  output: string;
  model?: string | null;
  payload?: Record<string, any> | null;
  created_at?: string | null;
};

type BriefingResponse = {
  briefing: {
    id: string;
    title: string;
    client_name?: string | null;
    payload?: Record<string, any>;
  };
  copies: CopyVersion[];
};

type OrchestratorInfo = {
  available?: string[];
  configured?: Record<string, boolean>;
  providers?: {
    available?: string[];
    configured?: Record<string, boolean>;
  };
  routing?: Record<string, { provider: string; tier: string }>;
};

type InventoryItem = {
  id: string;
  platform?: string;
  format?: string;
  production_type?: string;
};

type StoredClient = {
  id: string;
  name: string;
  segment?: string | null;
  city?: string | null;
  uf?: string | null;
};

type ParsedOption = {
  title: string;
  body: string;
  cta: string;
  raw: string;
};

const TASK_TYPES = [
  { value: 'social_post', label: 'Social post' },
  { value: 'headlines', label: 'Headlines' },
  { value: 'variations', label: 'Variações' },
  { value: 'institutional_copy', label: 'Institucional' },
  { value: 'campaign_strategy', label: 'Estratégia de campanha' },
];

const TONE_OPTIONS = ['Profissional', 'Inspirador', 'Casual', 'Persuasivo'];

function parseOptions(text: string): ParsedOption[] {
  if (!text) return [];
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    const options = parsed.options || parsed.copys || parsed.copies || parsed.variations;
    if (Array.isArray(options)) {
      return options.map((option: any) => ({
        title: option.title || option.headline || option.titulo || '',
        body: option.body || option.corpo || option.text || '',
        cta: option.cta || option.call_to_action || option.callToAction || '',
        raw: JSON.stringify(option),
      }));
    }
  } catch {
    // ignore JSON parse
  }

  const chunks = trimmed
    .split(/\n(?=\s*\d+[\).:-]\s+)/g)
    .map((chunk) => chunk.replace(/^\s*\d+[\).:-]\s*/, '').trim())
    .filter(Boolean);

  if (!chunks.length) {
    return [
      {
        title: '',
        body: trimmed,
        cta: '',
        raw: trimmed,
      },
    ];
  }

  return chunks.map((chunk) => {
    const titleMatch = chunk.match(/(?:titulo|title|headline)\s*[:\-]\s*(.+)/i);
    const bodyMatch = chunk.match(/(?:corpo|body|texto)\s*[:\-]\s*(.+)/i);
    const ctaMatch = chunk.match(/(?:cta|call to action)\s*[:\-]\s*(.+)/i);
    return {
      title: titleMatch?.[1]?.trim() || '',
      body: bodyMatch?.[1]?.trim() || chunk,
      cta: ctaMatch?.[1]?.trim() || '',
      raw: chunk,
    };
  });
}

export default function EditorClient() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<BriefingResponse['briefing'] | null>(null);
  const [copies, setCopies] = useState<CopyVersion[]>([]);
  const [orchestrator, setOrchestrator] = useState<OrchestratorInfo | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [activeFormatId, setActiveFormatId] = useState('');
  const [output, setOutput] = useState('');
  const [options, setOptions] = useState<ParsedOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(0);
  const [pipeline, setPipeline] = useState<'simple' | 'standard' | 'premium'>('standard');
  const [taskType, setTaskType] = useState('social_post');
  const [forceProvider, setForceProvider] = useState('');
  const [tone, setTone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copyProgressTick, setCopyProgressTick] = useState(0);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const activeFormat = useMemo(
    () => inventory.find((item) => item.id === activeFormatId) || inventory[0] || null,
    [inventory, activeFormatId]
  );

  const inventoryProgress = useMemo(() => {
    if (typeof window === 'undefined') {
      return { done: 0, total: inventory.length, items: [] as Array<InventoryItem & { hasCopy: boolean; key: string }> };
    }
    const map = JSON.parse(window.localStorage.getItem('edro_copy_by_platform_format') || '{}');
    const activeClient = resolveActiveClient();
    let done = 0;
    const items = inventory.map((item) => {
      const key = `${item.platform || 'Plataforma'}::${item.format || 'Formato'}`;
      const clientKey = activeClient?.id ? `${activeClient.id}::${key}` : key;
      const stored = map[clientKey] || map[key] || '';
      const hasCopy = typeof stored === 'string' && stored.trim().length > 0;
      if (hasCopy) done += 1;
      return { ...item, hasCopy, key };
    });
    return { done, total: inventory.length, items };
  }, [inventory, copyProgressTick]);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const briefingId = typeof window !== 'undefined' ? window.localStorage.getItem('edro_briefing_id') : null;
      if (!briefingId) {
        throw new Error('Nenhum briefing ativo encontrado. Volte para o passo 1.');
      }
      const response = await apiGet<{ success: boolean; data: BriefingResponse }>(`/edro/briefings/${briefingId}`);
      const data = response?.data;
      if (!data?.briefing) throw new Error('Briefing nao encontrado.');
      setBriefing(data.briefing);
      setCopies(data.copies || []);
      if (data.copies?.length) {
        const latest = data.copies[0];
        setOutput(latest.output || '');
        const parsed = parseOptions(latest.output || '');
        setOptions(parsed);
        setSelectedOption(0);
      }
      if (data.briefing?.payload?.tone && !tone) {
        setTone(String(data.briefing.payload.tone));
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar briefing.');
    } finally {
      setLoading(false);
    }
  }, [tone]);

  const loadOrchestrator = useCallback(async () => {
    try {
      const response = await apiGet<{ success: boolean; data: OrchestratorInfo }>('/edro/orchestrator');
      setOrchestrator(response?.data || {});
    } catch {
      setOrchestrator(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('edro_selected_inventory');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setInventory(
            parsed.map((item: any) => ({
              id: item.id,
              platform: item.platform || item.platformId,
              format: item.format,
              production_type: item.production_type,
            }))
          );
          if (parsed[0]?.id) setActiveFormatId(parsed[0].id);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const formatLabel = activeFormat
    ? `${activeFormat.platform || 'Plataforma'} • ${activeFormat.format || 'Formato'}`
    : 'Formato nao definido';

  const providerLabels = useMemo(() => {
    const available = orchestrator?.available ?? orchestrator?.providers?.available ?? [];
    const configured = orchestrator?.configured ?? orchestrator?.providers?.configured ?? {};
    if (!available.length) return [];
    const map: Record<string, string> = {
      openai: 'OpenAI',
      gemini: 'Gemini',
      claude: 'Claude',
    };
    return available.map((provider) => ({
      provider,
      label: map[provider] || provider,
      configured: configured?.[provider] ?? true,
    }));
  }, [orchestrator]);

  const persistCopyMaps = useCallback(
    (
      formatKey: string,
      outputText: string,
      parsedOptions: ParsedOption[],
      copyMeta: CopyVersion,
      clientId?: string
    ) => {
      if (typeof window === 'undefined') return;
      const copyMap = JSON.parse(window.localStorage.getItem('edro_copy_by_platform_format') || '{}');
      const key = clientId ? `${clientId}::${formatKey}` : formatKey;
      copyMap[key] = outputText || '';
      window.localStorage.setItem('edro_copy_by_platform_format', JSON.stringify(copyMap));

      const optionsMap = JSON.parse(window.localStorage.getItem('edro_copy_options_by_platform_format') || '{}');
      optionsMap[key] = parsedOptions;
      window.localStorage.setItem('edro_copy_options_by_platform_format', JSON.stringify(optionsMap));

      const metaMap = JSON.parse(window.localStorage.getItem('edro_copy_meta_by_platform_format') || '{}');
      metaMap[key] = {
        model: copyMeta.model,
        provider: copyMeta.payload?.provider || copyMeta.payload?._edro?.provider || '',
        tier: copyMeta.payload?.tier || copyMeta.payload?._edro?.tier || '',
        task_type: copyMeta.payload?.taskType || copyMeta.payload?._edro?.task_type || '',
      };
      window.localStorage.setItem('edro_copy_meta_by_platform_format', JSON.stringify(metaMap));
    },
    []
  );

  const resolveActiveClient = () => {
    if (typeof window === 'undefined') return null;
    const activeId = window.localStorage.getItem('edro_active_client_id') || '';
    const raw = window.localStorage.getItem('edro_selected_clients');
    if (!raw) return activeId ? { id: activeId, name: activeId } : null;
    try {
      const parsed = JSON.parse(raw) as StoredClient[];
      if (activeId) {
        return parsed.find((client) => client.id === activeId) || parsed[0] || null;
      }
      return parsed[0] || null;
    } catch {
      return activeId ? { id: activeId, name: activeId } : null;
    }
  };

  const readSelectedClients = () => {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem('edro_selected_clients');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StoredClient[]) : [];
    } catch {
      return [];
    }
  };

  const resolveTargetClients = () => {
    const selectedClients = readSelectedClients();
    if (selectedClients.length) return selectedClients;
    const active = resolveActiveClient();
    return active ? [active] : [];
  };

  const loadCopyForActiveClient = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!activeFormat?.platform || !activeFormat?.format) return;
    const formatKey = `${activeFormat.platform}::${activeFormat.format}`;
    const activeClient = resolveActiveClient();
    const clientKey = activeClient?.id ? `${activeClient.id}::${formatKey}` : formatKey;

    try {
      const outputMap = JSON.parse(window.localStorage.getItem('edro_copy_by_platform_format') || '{}');
      const storedOutput = outputMap[clientKey] || outputMap[formatKey];
      if (storedOutput) {
        setOutput(String(storedOutput));
        const parsed = parseOptions(String(storedOutput));
        setOptions(parsed);
        setSelectedOption(0);
      }

      const optionsMap = JSON.parse(window.localStorage.getItem('edro_copy_options_by_platform_format') || '{}');
      const storedOptions = optionsMap[clientKey] || optionsMap[formatKey];
      if (Array.isArray(storedOptions) && storedOptions.length) {
        setOptions(storedOptions);
        setSelectedOption(0);
      }
    } catch {
      // ignore cache errors
    }
  }, [activeFormat?.platform, activeFormat?.format]);

  useEffect(() => {
    loadBriefing();
    loadOrchestrator();
  }, [loadBriefing, loadOrchestrator]);

  useEffect(() => {
    loadCopyForActiveClient();
    if (typeof window === 'undefined') return;
    const handler = () => {
      loadCopyForActiveClient();
    };
    window.addEventListener('edro-studio-context-change', handler);
    return () => {
      window.removeEventListener('edro-studio-context-change', handler);
    };
  }, [loadCopyForActiveClient]);

  const handleGenerate = async () => {
    if (!briefing?.id) return;
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      const formatName = activeFormat?.format || '';
      const formatLower = formatName.toLowerCase();
      const extraGuidelines: string[] = [];
      if (formatLower.includes('radio') || formatLower.includes('spot')) {
        extraGuidelines.push('Formato de radio: gerar roteiro curto com tempo estimado e fala fluida.');
      }
      if (formatLower.includes('tv') || formatLower.includes('video')) {
        extraGuidelines.push('Formato audiovisual: incluir indicacoes de cena e locucao quando pertinente.');
      }
      if (formatLower.includes('outdoor') || formatLower.includes('ooh') || formatLower.includes('busdoor')) {
        extraGuidelines.push('OOH: copy curto, direto e legivel a distancia.');
      }

      const targetClients = resolveTargetClients();
      const activeClient = resolveActiveClient();
      const clientsToGenerate = targetClients.length ? targetClients : [null];
      const primaryClientId = activeClient?.id || clientsToGenerate[0]?.id || '';
      let primaryCopy: CopyVersion | null = null;

      for (const client of clientsToGenerate) {
        const instructionLines = [
          client?.name ? `Cliente: ${client.name}` : '',
          client?.segment ? `Segmento: ${client.segment}` : '',
          `Formato selecionado: ${activeFormat?.format || 'nao informado'}`,
          `Plataforma: ${activeFormat?.platform || 'nao informado'}`,
          activeFormat?.production_type ? `Tipo de producao: ${activeFormat.production_type}` : '',
          tone ? `Tom de voz: ${tone}` : '',
          clientsToGenerate.length > 1 ? 'Gerar opcoes alinhadas a este cliente.' : '',
          'Retorne opcoes separadas e numeradas.',
          ...extraGuidelines,
          instructions,
        ].filter(Boolean);

        const response = await apiPost<{ success: boolean; data: { copy: CopyVersion } }>(
          `/edro/briefings/${briefing.id}/copy`,
          {
            count,
            pipeline,
            task_type: taskType,
            force_provider: forceProvider || undefined,
            instructions: instructionLines.join('\n'),
            metadata: {
              format: activeFormat?.format || null,
              platform: activeFormat?.platform || null,
              production_type: activeFormat?.production_type || null,
              client_id: client?.id || null,
              client_name: client?.name || null,
              tone,
              task_type: taskType,
              pipeline,
              provider: forceProvider || null,
            },
          }
        );

        const created = response?.data?.copy;
        if (!created?.id) throw new Error('Falha ao gerar copy.');

        setCopies((prev) => [created, ...prev]);
        if (!primaryCopy && (!primaryClientId || client?.id === primaryClientId)) {
          primaryCopy = created;
        }

        if (typeof window !== 'undefined' && activeFormat?.platform && activeFormat?.format) {
          const key = `${activeFormat.platform}::${activeFormat.format}`;
          const parsed = parseOptions(created.output || '');
          persistCopyMaps(key, created.output || '', parsed, created, client?.id);
          setCopyProgressTick((prev) => prev + 1);
        }
      }

      if (primaryCopy) {
        setOutput(primaryCopy.output || '');
        const parsed = parseOptions(primaryCopy.output || '');
        setOptions(parsed);
        setSelectedOption(0);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('edro_copy_version_id', primaryCopy.id);
        }
        setCopyProgressTick((prev) => prev + 1);
      }

      setSuccess(
        clientsToGenerate.length > 1
          ? `Copys geradas para ${clientsToGenerate.length} clientes.`
          : 'Copy gerada com sucesso.'
      );
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar copy.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectVersion = (copy: CopyVersion) => {
    setOutput(copy.output || '');
    const parsed = parseOptions(copy.output || '');
    setOptions(parsed);
    setSelectedOption(0);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('edro_copy_version_id', copy.id);
      if (activeFormat?.platform && activeFormat?.format) {
        const key = `${activeFormat.platform}::${activeFormat.format}`;
        const parsed = parseOptions(copy.output || '');
        const activeClient = resolveActiveClient();
        persistCopyMaps(key, copy.output || '', parsed, copy, activeClient?.id);
      }
    }
    setCopyProgressTick((prev) => prev + 1);
  };

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
    if (typeof window !== 'undefined') {
      const selected = options[index];
      window.localStorage.setItem(
        'edro_selected_copy_option',
        JSON.stringify({
          copyVersionId: typeof window !== 'undefined' ? window.localStorage.getItem('edro_copy_version_id') : null,
          optionIndex: index,
          option: selected,
        })
      );
      if (activeFormat?.platform && activeFormat?.format) {
        const key = `${activeFormat.platform}::${activeFormat.format}`;
        const map = JSON.parse(window.localStorage.getItem('edro_copy_by_platform_format') || '{}');
        const activeClient = resolveActiveClient();
        const clientKey = activeClient?.id ? `${activeClient.id}::${key}` : key;
        map[clientKey] = output || '';
        window.localStorage.setItem('edro_copy_by_platform_format', JSON.stringify(map));
      }
    }
    setCopyProgressTick((prev) => prev + 1);
  };

  if (loading && !briefing) {
    return (
      <div className="loading-screen">
        <div className="pulse">Carregando copy studio...</div>
      </div>
    );
  }

  return (
    <AppShell title="Creative Studio" meta="Etapa 3 de 6">
      <div className="page-content">
        <div>
          <h1>Copy Studio</h1>
          <p>Gere e ajuste copys usando o motor de IA.</p>
        </div>

        {error ? <div className="notice error">{error}</div> : null}
        {success ? <div className="notice success">{success}</div> : null}

        <div className="panel-grid">
          <section className="panel-main space-y-4">
            <div className="card">
              <div className="card-top">
                <span className="badge">{formatLabel}</span>
              </div>
              <textarea
                className="w-full min-h-[360px] border border-slate-200 rounded-xl p-4 text-sm leading-relaxed"
                value={output}
                onChange={(event) => setOutput(event.target.value)}
                placeholder="O texto gerado aparecera aqui..."
              />
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-slate-400">
                  {options.length ? `${options.length} opcoes detectadas` : 'Sem opcoes estruturadas'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn ghost text-xs"
                    type="button"
                    onClick={() => setShowVersionHistory(true)}
                    disabled={!activeFormat?.id}
                  >
                    📜 History
                  </button>
                  <button className="btn ghost" type="button" onClick={handleGenerate} disabled={generating}>
                    {generating ? 'Gerando...' : 'Gerar com IA'}
                  </button>
                </div>
              </div>
            </div>

            {options.length ? (
              <div className="card">
                <div className="card-top">
                  <span className="badge">Opcoes de copy</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {options.map((option, index) => (
                    <button
                      key={index}
                      className={`text-left border rounded-xl p-4 hover:border-primary transition-colors ${
                        selectedOption === index ? 'border-primary bg-orange-50' : 'border-slate-200'
                      }`}
                      type="button"
                      onClick={() => handleSelectOption(index)}
                    >
                      <h4 className="font-semibold text-sm mb-2">
                        {option.title || `Opcao ${index + 1}`}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-4">{option.body || option.raw}</p>
                      {option.cta ? <p className="text-xs text-primary mt-2">CTA: {option.cta}</p> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {copies.length ? (
              <div className="card">
                <div className="card-top">
                  <span className="badge">Historico de versoes</span>
                </div>
                <div className="detail-list">
                  {copies.map((copy) => (
                    <button
                      key={copy.id}
                      type="button"
                      className="copy-block text-left"
                      onClick={() => handleSelectVersion(copy)}
                    >
                      <div className="card-title">
                        <h3>{copy.model || 'IA'}</h3>
                        <span className="status">
                          {copy.created_at ? new Date(copy.created_at).toLocaleString('pt-BR') : 'Agora'}
                        </span>
                      </div>
                      <p className="card-text line-clamp-2">{copy.output?.slice(0, 160)}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="panel-sidebar space-y-4">
            <div className="card">
              <div className="card-top">
                <span className="badge">Inventario de pecas</span>
                <span className="status">
                  {inventoryProgress.done}/{inventoryProgress.total}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: inventoryProgress.total
                      ? `${Math.round((inventoryProgress.done / inventoryProgress.total) * 100)}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="detail-list">
                {inventoryProgress.items.length ? (
                  inventoryProgress.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`inventory-row ${item.id === activeFormatId ? 'active' : ''}`}
                      onClick={() => setActiveFormatId(item.id)}
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {item.platform || 'Plataforma'} · {item.format || 'Formato'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.production_type ? item.production_type : 'Tipo nao informado'}
                        </div>
                      </div>
                      <span className={`status-pill ${item.hasCopy ? 'done' : 'pending'}`}>
                        {item.hasCopy ? 'Feito' : 'Pendente'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="empty">Nenhum formato selecionado.</div>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card-top">
                <span className="badge">Formatos selecionados</span>
              </div>
              <div className="detail-list">
                {inventory.length ? (
                  <select
                    className="edro-select"
                    value={activeFormat?.id || ''}
                    onChange={(event) => setActiveFormatId(event.target.value)}
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.platform || 'Plataforma'} · {item.format || 'Formato'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="empty">Nenhum formato selecionado.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Tom de voz</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    className={`btn ${tone === option ? 'primary' : 'ghost'}`}
                    type="button"
                    onClick={() => setTone(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-top">
                <span className="badge">Motor de Copys</span>
              </div>
              <div className="detail-list">
                <div className="card-title">
                  <h3>IA disponiveis</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {providerLabels.length ? (
                    providerLabels.map((provider) => (
                      <span key={provider.provider} className="badge">
                        {provider.label} {provider.configured ? '✓' : 'x'}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Nao informado</span>
                  )}
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  Pipeline
                  <select value={pipeline} onChange={(event) => setPipeline(event.target.value as any)}>
                    <option value="simple">Rápido</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </label>
                <label className="field">
                  Tipo de copy
                  <select value={taskType} onChange={(event) => setTaskType(event.target.value)}>
                    {TASK_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Provider (opcional)
                  <select value={forceProvider} onChange={(event) => setForceProvider(event.target.value)}>
                    <option value="">Auto</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                    <option value="claude">Claude</option>
                  </select>
                </label>
                <label className="field">
                  Quantidade
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                  />
                </label>
                <label className="field full">
                  Instrucoes extras
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="Ex: roteiro de radio 15s, linguagem emocional, etc."
                  />
                </label>
              </div>
            </div>
          </aside>
        </div>

        <div className="form-actions">
          <button className="btn ghost" type="button" onClick={() => router.back()}>
            Voltar
          </button>
          <button className="btn primary" type="button" onClick={() => router.push('/studio/mockups')}>
            Aprovar e avancar
          </button>
        </div>
      </div>

      {activeFormat?.id && (
        <PostVersionHistory
          postAssetId={activeFormat.id}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </AppShell>
  );
}
