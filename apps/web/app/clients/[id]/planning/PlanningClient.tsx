'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '@/lib/api';

type ContentPillar = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

type StrategicObjective = {
  id: string;
  text: string;
  completed: boolean;
};

type RoadmapItem = {
  id: string;
  title: string;
  label: string;
  color: string;
  startQ: number;
  spanQ: number;
};

type PlanningData = {
  brand_positioning?: string;
  primary_voice?: string;
  creative_direction_title?: string;
  creative_direction_description?: string;
  creative_tags?: string[];
  objectives?: StrategicObjective[];
  pillars?: ContentPillar[];
  roadmap?: RoadmapItem[];
  notes?: string;
  notes_updated_at?: string;
  notes_updated_by?: string;
};

type PlanningClientProps = {
  clientId: string;
};

const DEFAULT_PILLARS: ContentPillar[] = [
  { id: '1', title: 'Product Heritage', description: 'Deep dives into sourcing, botanical history, and craft.', icon: 'history_edu' },
  { id: '2', title: 'Community Stories', description: 'User generated content and local tastemaker profiles.', icon: 'group' },
  { id: '3', title: 'Sustainability', description: 'Radical transparency on packaging and supply chain.', icon: 'eco' },
  { id: '4', title: 'Brand Moments', description: 'Lifestyle aesthetic moments and consumption rituals.', icon: 'auto_awesome' },
];

const DEFAULT_ROADMAP: RoadmapItem[] = [
  { id: '1', title: 'Brand Awareness', label: 'Always-On Narrative', color: 'bg-[#FF6600]', startQ: 0, spanQ: 3 },
  { id: '2', title: 'New Collection Launch', label: 'Summer Artisan Series', color: 'bg-indigo-500', startQ: 1, spanQ: 1 },
  { id: '3', title: 'Holiday Push', label: 'Gifting Season', color: 'bg-rose-500', startQ: 3, spanQ: 1 },
];

export default function PlanningClient({ clientId }: PlanningClientProps) {
  const [data, setData] = useState<PlanningData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');

  const loadPlanning = useCallback(async () => {
    try {
      const res = await apiGet<{ planning: PlanningData }>(`/clients/${clientId}/planning`).catch(() => ({ planning: {} }));
      const planning = res.planning || {};
      setData({
        ...planning,
        pillars: planning.pillars?.length ? planning.pillars : DEFAULT_PILLARS,
        roadmap: planning.roadmap?.length ? planning.roadmap : DEFAULT_ROADMAP,
      });
      setNotesText(planning.notes || '');
    } catch (err) {
      console.error('Failed to load planning:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadPlanning();
  }, [loadPlanning]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await apiPatch(`/clients/${clientId}/planning`, { notes: notesText });
      setData((prev) => ({ ...prev, notes: notesText, notes_updated_at: new Date().toISOString() }));
      setEditingNotes(false);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold text-sm"
        >
          <span className="material-symbols-outlined text-sm text-slate-500">file_download</span>
          Export PDF
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 bg-[#FF6600] text-white rounded-lg hover:bg-orange-600 transition-all font-semibold text-sm shadow-lg shadow-orange-500/20"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          Save Planning
        </button>
      </div>

      {/* Strategic Foundation */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-[1px] bg-[#FF6600]" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Strategic Foundation</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Brand Positioning */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
            <h3 className="font-display text-3xl mb-4">Brand Positioning</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg italic">
              {data.brand_positioning ||
                '"Our client offers a premium experience that connects modern lifestyle with authentic sustainable practices, focused on quality and heritage."'}
            </p>
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2">Primary Voice</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {data.primary_voice || 'Sophisticated, Earnest, Timeless'}
              </p>
            </div>
          </div>

          {/* Strategic Objectives */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
            <h3 className="font-display text-3xl mb-4">Strategic Objectives</h3>
            <ul className="space-y-4">
              {(data.objectives || [
                { id: '1', text: 'Increase brand awareness in target markets by 25% through localized storytelling.', completed: true },
                { id: '2', text: 'Establish signature social media rituals for consumers.', completed: true },
                { id: '3', text: 'Launch collaborative capsule collections with sustainable partners.', completed: false },
              ]).map((obj) => (
                <li key={obj.id} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#FF6600] mt-1">check_circle</span>
                  <span className="text-slate-600 dark:text-slate-300">{obj.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Creative Direction */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-[1px] bg-[#FF6600]" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Creative Direction</h2>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm relative overflow-hidden">
          <div className="max-w-4xl">
            <h3 className="font-display text-4xl mb-6">
              {data.creative_direction_title || 'Minimalist Elegance & Tactile Heritage'}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-6">
              {data.creative_direction_description ||
                'The visual strategy centers on authentic aesthetics. We will transition from high-gloss studio environments to natural, high-contrast natural light photography. The color palette remains anchored with seasonal accents introduced through prop styling.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {(data.creative_tags || ['Natural Grain', 'Architectural Framing', 'Human Centric']).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-full uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Pillars */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-[1px] bg-[#FF6600]" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Content Pillars</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {(data.pillars || DEFAULT_PILLARS).map((pillar) => (
            <div
              key={pillar.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:border-[#FF6600]/50 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 text-[#FF6600] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">{pillar.icon}</span>
              </div>
              <h4 className="font-bold text-sm mb-2">{pillar.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pillar.description}</p>
            </div>
          ))}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-[#FF6600] mb-2">add_circle</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add Pillar</span>
          </div>
        </div>
      </section>

      {/* Annual Roadmap */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-[1px] bg-[#FF6600]" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Annual Roadmap</h2>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
          {/* Quarter Headers */}
          <div className="grid grid-cols-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q, idx) => (
              <div
                key={q}
                className={`text-center font-display text-2xl text-slate-400 ${idx > 0 ? 'border-l border-slate-100 dark:border-slate-800' : ''}`}
              >
                {q}
              </div>
            ))}
          </div>
          {/* Roadmap Items */}
          <div className="space-y-6 relative">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-[1px] h-full bg-slate-300 dark:bg-slate-700" />
              ))}
            </div>
            {/* Items */}
            {(data.roadmap || DEFAULT_ROADMAP).map((item) => (
              <div
                key={item.id}
                className="relative z-10"
                style={{ marginLeft: `${item.startQ * 25}%` }}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{item.title}</p>
                <div
                  className={`${item.color} text-white text-xs font-bold py-2 px-4 rounded-lg shadow-sm`}
                  style={{ width: `${item.spanQ * 25}%`, minWidth: '120px' }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creative Notes */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-[1px] bg-[#FF6600]" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Creative Notes</h2>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
          <textarea
            className="w-full h-48 bg-transparent border-none focus:ring-0 p-6 text-slate-600 dark:text-slate-300 resize-none placeholder:text-slate-400"
            placeholder="Type collaborative notes here... These are persistent across the creative team."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            disabled={!editingNotes}
          />
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {data.notes_updated_at
                ? `Last updated ${new Date(data.notes_updated_at).toLocaleDateString()}`
                : 'No notes yet'}
            </span>
            {editingNotes ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNotesText(data.notes || '');
                    setEditingNotes(false);
                  }}
                  className="text-slate-500 text-[10px] font-bold uppercase hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNotes}
                  disabled={saving}
                  className="text-[#FF6600] text-[10px] font-bold uppercase hover:underline"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingNotes(true)}
                className="text-[#FF6600] text-[10px] font-bold uppercase hover:underline"
              >
                Edit Notes
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
