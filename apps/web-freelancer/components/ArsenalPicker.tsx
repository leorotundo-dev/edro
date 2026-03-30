'use client';

import { useState, useRef, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkillLevel = 'junior' | 'pleno' | 'ninja';
export type SkillCategory = 'disciplinas' | 'softwares' | 'ia' | 'tech';

type SkillItem = {
  id: string;
  label: string;
  category: SkillCategory;
};

export type SelectedSkill = {
  id: string;
  label: string;
  category: SkillCategory;
  level: SkillLevel;
};

// ── Catalog ───────────────────────────────────────────────────────────────────

const CATALOG: SkillItem[] = [
  // 🎨 Disciplinas & Entregáveis
  { id: 'dir_arte',          label: 'Direção de Arte',               category: 'disciplinas' },
  { id: 'ui_ux',             label: 'UI/UX Design',                  category: 'disciplinas' },
  { id: 'web_design',        label: 'Web Design',                    category: 'disciplinas' },
  { id: 'identidade_visual', label: 'Identidade Visual',             category: 'disciplinas' },
  { id: 'key_visual',        label: 'Key Visual (KV)',               category: 'disciplinas' },
  { id: 'print',             label: 'Fechamento de Arquivo (Print)', category: 'disciplinas' },
  { id: 'motion',            label: 'Motion Design (2D/3D)',         category: 'disciplinas' },
  { id: 'edicao_video',      label: 'Edição de Vídeo',               category: 'disciplinas' },
  { id: 'videomaker',        label: 'Captação (Videomaker)',          category: 'disciplinas' },
  { id: 'fotografia',        label: 'Fotografia',                    category: 'disciplinas' },
  { id: 'color_grading',     label: 'Color Grading',                 category: 'disciplinas' },
  { id: 'animacao',          label: 'Animação Tradicional',          category: 'disciplinas' },
  { id: 'copywriting',       label: 'Redação Publicitária',          category: 'disciplinas' },
  { id: 'roteiro',           label: 'Roteiro',                       category: 'disciplinas' },
  { id: 'estrategia',        label: 'Estratégia de Conteúdo',        category: 'disciplinas' },
  { id: 'planejamento',      label: 'Planejamento',                  category: 'disciplinas' },
  { id: 'seo',               label: 'SEO',                           category: 'disciplinas' },
  { id: 'ilustracao_dig',    label: 'Ilustração Digital',            category: 'disciplinas' },
  { id: 'ilustracao_vet',    label: 'Ilustração Vetorial',           category: 'disciplinas' },
  { id: 'concept_art',       label: 'Concept Art',                   category: 'disciplinas' },
  { id: 'modelagem_3d',      label: 'Modelagem 3D',                  category: 'disciplinas' },
  { id: 'trafego_pago',      label: 'Tráfego Pago (Ads)',            category: 'disciplinas' },
  { id: 'analytics',         label: 'Web Analytics',                 category: 'disciplinas' },
  { id: 'bi',                label: 'Business Intelligence (BI)',    category: 'disciplinas' },

  // 🛠️ Stack de Softwares
  { id: 'photoshop',    label: 'Photoshop',    category: 'softwares' },
  { id: 'illustrator',  label: 'Illustrator',  category: 'softwares' },
  { id: 'indesign',     label: 'InDesign',     category: 'softwares' },
  { id: 'after_effects',label: 'After Effects',category: 'softwares' },
  { id: 'premiere',     label: 'Premiere Pro', category: 'softwares' },
  { id: 'lightroom',    label: 'Lightroom',    category: 'softwares' },
  { id: 'audition',     label: 'Audition',     category: 'softwares' },
  { id: 'davinci',      label: 'DaVinci Resolve', category: 'softwares' },
  { id: 'cinema4d',     label: 'Cinema 4D',    category: 'softwares' },
  { id: 'blender',      label: 'Blender',      category: 'softwares' },
  { id: 'maya',         label: 'Maya',         category: 'softwares' },
  { id: 'capcut',       label: 'CapCut Pro',   category: 'softwares' },
  { id: 'figma',        label: 'Figma',        category: 'softwares' },
  { id: 'sketch',       label: 'Sketch',       category: 'softwares' },
  { id: 'adobe_xd',    label: 'Adobe XD',     category: 'softwares' },

  // 🤖 Inteligência Artificial
  { id: 'midjourney',   label: 'Midjourney',           category: 'ia' },
  { id: 'stable_diff',  label: 'Stable Diffusion',     category: 'ia' },
  { id: 'dalle3',       label: 'DALL-E 3',             category: 'ia' },
  { id: 'runway',       label: 'Runway Gen-2',         category: 'ia' },
  { id: 'pika',         label: 'Pika Labs',            category: 'ia' },
  { id: 'firefly',      label: 'Adobe Firefly',        category: 'ia' },
  { id: 'chatgpt',      label: 'ChatGPT / Prompt Eng', category: 'ia' },
  { id: 'claude_ai',    label: 'Claude',               category: 'ia' },
  { id: 'gemini_ai',    label: 'Gemini',               category: 'ia' },
  { id: 'notion_ai',    label: 'Notion AI',            category: 'ia' },

  // 💻 Tech & Código
  { id: 'wordpress',    label: 'WordPress',    category: 'tech' },
  { id: 'webflow',      label: 'Webflow',      category: 'tech' },
  { id: 'shopify',      label: 'Shopify',      category: 'tech' },
  { id: 'wix',          label: 'Wix Studio',   category: 'tech' },
  { id: 'html_css',     label: 'HTML5 / CSS3', category: 'tech' },
  { id: 'javascript',   label: 'JavaScript',   category: 'tech' },
  { id: 'react',        label: 'React',        category: 'tech' },
  { id: 'php',          label: 'PHP',          category: 'tech' },
  { id: 'python',       label: 'Python',       category: 'tech' },
];

// ── Category config ───────────────────────────────────────────────────────────

const CAT: Record<SkillCategory, { emoji: string; label: string; color: string; bg: string; border: string }> = {
  disciplinas: { emoji: '🎨', label: 'Disciplinas & Entregáveis',  color: '#A78BFA', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.25)' },
  softwares:   { emoji: '🛠️', label: 'Stack de Softwares',         color: '#5D87FF', bg: 'rgba(93,135,255,0.10)',  border: 'rgba(93,135,255,0.25)' },
  ia:          { emoji: '🤖', label: 'Inteligência Artificial',    color: '#E85219', bg: 'rgba(232,82,25,0.10)',   border: 'rgba(232,82,25,0.25)' },
  tech:        { emoji: '💻', label: 'Tech & Código',              color: '#13DEB9', bg: 'rgba(19,222,185,0.10)', border: 'rgba(19,222,185,0.25)' },
};

const CAT_ORDER: SkillCategory[] = ['disciplinas', 'softwares', 'ia', 'tech'];

// ── Level config ──────────────────────────────────────────────────────────────

const LEVELS: { value: SkillLevel; emoji: string; label: string; sub: string }[] = [
  { value: 'junior', emoji: '🌱', label: 'Júnior',      sub: 'Fazemos o básico' },
  { value: 'pleno',  emoji: '🚀', label: 'Pleno',       sub: 'Entregamos com agilidade' },
  { value: 'ninja',  emoji: '🧙', label: 'Ninja/Sênior',sub: 'Resolvemos qualquer BO' },
];

const MAX = Infinity;

// ── Level picker modal ────────────────────────────────────────────────────────

function LevelPicker({
  skill,
  onPick,
  onCancel,
}: {
  skill: SkillItem;
  onPick: (level: SkillLevel) => void;
  onCancel: () => void;
}) {
  const cat = CAT[skill.category];
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16, padding: '24px 22px', width: '100%', maxWidth: 360,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ marginBottom: 18, textAlign: 'center' }}>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '3px 10px',
            borderRadius: 20, background: cat.bg, border: `1px solid ${cat.border}`,
            color: cat.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            {cat.emoji} {cat.label}
          </span>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {skill.label}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Qual é o nível do seu estúdio nessa solução?
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {LEVELS.map(lv => (
            <button
              key={lv.value}
              type="button"
              onClick={() => onPick(lv.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.15s', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = cat.bg; (e.currentTarget as HTMLElement).style.borderColor = cat.border; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{lv.emoji}</span>
              <span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{lv.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{lv.sub}</div>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            marginTop: 12, width: '100%', padding: '9px', borderRadius: 8,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ArsenalPicker({
  value,
  onChange,
}: {
  value: SelectedSkill[];
  onChange: (skills: SelectedSkill[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<SkillItem | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedIds = new Set(value.map(s => s.id));
  const atMax = value.length >= MAX;

  const searchResults = search.trim().length >= 1
    ? CATALOG.filter(
        s => s.label.toLowerCase().includes(search.toLowerCase()) && !selectedIds.has(s.id)
      ).slice(0, 8)
    : [];

  function pickSkill(skill: SkillItem) {
    if (selectedIds.has(skill.id)) {
      // deselect
      onChange(value.filter(s => s.id !== skill.id));
    } else if (!atMax) {
      setSearch('');
      setShowSearch(false);
      setPending(skill);
    }
  }

  function confirmLevel(level: SkillLevel) {
    if (!pending) return;
    onChange([...value, { ...pending, level }]);
    setPending(null);
  }

  const levelEmoji: Record<SkillLevel, string> = { junior: '🌱', pleno: '🚀', ninja: '🧙' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Selected pills */}
      {value.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Seu arsenal — {value.length} selecionadas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {value.map(s => {
              const cat = CAT[s.category];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange(value.filter(x => x.id !== s.id))}
                  title="Clique para remover"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 20, cursor: 'pointer',
                    background: cat.bg, border: `1.5px solid ${cat.border}`,
                    color: cat.color, fontSize: 12, fontWeight: 600,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <span>{levelEmoji[s.level]}</span>
                  <span>{s.label}</span>
                  <span style={{ opacity: 0.5, marginLeft: 2 }}>×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* Search */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
          }}>
            🔍
          </span>
          <input
            ref={searchRef}
            type="text"
            placeholder='Buscar habilidade... ex: "Motion", "Figma", "Blender"'
            value={search}
            disabled={atMax}
            onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 150)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 10, padding: '11px 12px 11px 36px',
              color: '#fff', fontSize: 14, outline: 'none',
              opacity: atMax ? 0.4 : 1,
            }}
          />
        </div>

        {/* Autocomplete dropdown */}
        {showSearch && searchResults.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {searchResults.map(s => {
              const cat = CAT[s.category];
              return (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={() => pickSkill(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 14px', cursor: 'pointer',
                    background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    textAlign: 'left', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                    background: cat.bg, color: cat.color, whiteSpace: 'nowrap',
                  }}>
                    {cat.emoji}
                  </span>
                  <span style={{ fontSize: 13, color: '#fff' }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category buckets */}
      {CAT_ORDER.map(catKey => {
        const cat = CAT[catKey];
        const items = CATALOG.filter(s => s.category === catKey);
        return (
          <div key={catKey} style={{
            borderRadius: 12, border: `1px solid ${cat.border}`,
            background: 'rgba(255,255,255,0.02)',
            overflow: 'hidden',
          }}>
            {/* Category header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: `1px solid ${cat.border}`,
              background: cat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>
                {cat.emoji} {cat.label}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                {value.filter(s => s.category === catKey).length} selecionadas
              </span>
            </div>

            {/* Pills grid */}
            <div style={{ padding: '12px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {items.map(s => {
                const isSel = selectedIds.has(s.id);
                const selData = value.find(x => x.id === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!isSel && atMax}
                    onClick={() => pickSkill(s)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: isSel ? '5px 10px' : '5px 11px',
                      borderRadius: 20, cursor: (!isSel && atMax) ? 'not-allowed' : 'pointer',
                      border: isSel ? `1.5px solid ${cat.color}` : '1px solid rgba(255,255,255,0.10)',
                      background: isSel ? cat.bg : 'rgba(255,255,255,0.03)',
                      color: isSel ? cat.color : 'rgba(255,255,255,0.55)',
                      fontSize: 12, fontWeight: isSel ? 700 : 400,
                      opacity: (!isSel && atMax) ? 0.3 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {isSel && selData && <span>{levelEmoji[selData.level]}</span>}
                    {s.label}
                    {isSel && <span style={{ opacity: 0.5, fontSize: 10 }}>×</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Level picker modal */}
      {pending && (
        <LevelPicker
          skill={pending}
          onPick={confirmLevel}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
