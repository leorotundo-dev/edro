'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, Badge } from '@edro/ui';
import { Brain, Search, Plus, BookMarked, Star, TrendingUp, Sparkles, Trash2, Volume2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/api';
import { playTts } from '@/lib/tts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type Discipline = {
  id: string;
  name: string;
};

type Mnemonic = {
  id: string;
  tecnica?: string;
  texto_principal: string;
  explicacao?: string;
  versoes_alternativas?: string[];
  subtopico?: string;
  banca?: string;
  disciplina_id?: string;
  nivel_dificuldade?: number;
};

type MnemonicUser = {
  id: string;
  user_id: string;
  mnemonico_id: string;
  favorito: boolean;
  criado_por_usuario: boolean;
  vezes_usado: number;
  funciona_bem?: boolean;
  mnemonico: Mnemonic;
};

type MnemonicStats = {
  total_mnemonics: number;
  total_favorites: number;
  avg_effectiveness: number;
};

const emptyStats: MnemonicStats = {
  total_mnemonics: 0,
  total_favorites: 0,
  avg_effectiveness: 0,
};

export default function MnemonicosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [mnemonics, setMnemonics] = useState<MnemonicUser[]>([]);
  const [stats, setStats] = useState<MnemonicStats>(emptyStats);
  const [disciplines, setDisciplines] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'manual' | 'ai'>('ai');
  const [submitting, setSubmitting] = useState(false);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tecnica: 'acronimo',
    texto_principal: '',
    explicacao: '',
    subtopico: '',
    conteudo: '',
    banca: '',
    disciplina_id: '',
    nivel_dificuldade: 1,
    estilo_cognitivo: '',
    humor: '',
    energia: '',
    variacoes: 2,
  });

  const authHeaders = useMemo(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('edro_token')
      : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;
  }, []);

  const disciplineOptions = useMemo(() => {
    const entries = Object.entries(disciplines);
    return entries.map(([id, name]) => ({ id, name }));
  }, [disciplines]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = getCurrentUser();
      if (!user?.id && !user?.sub) {
        throw new Error('Usuario nao autenticado');
      }

      const [libraryRes, statsRes, disciplinesRes] = await Promise.all([
        fetch(`${API_URL}/api/mnemonics/user/library`, { headers: authHeaders }),
        fetch(`${API_URL}/api/mnemonics/user/stats`, { headers: authHeaders }),
        fetch(`${API_URL}/api/disciplines`),
      ]);

      const libraryPayload = await libraryRes.json();
      const statsPayload = await statsRes.json();
      const disciplinesPayload = await disciplinesRes.json();

      if (!libraryRes.ok || !libraryPayload.success) {
        throw new Error(libraryPayload?.error || 'Erro ao carregar mnemonicos');
      }

      if (disciplinesRes.ok && disciplinesPayload?.disciplines) {
        const map: Record<string, string> = {};
        disciplinesPayload.disciplines.forEach((item: Discipline) => {
          map[item.id] = item.name;
        });
        setDisciplines(map);
      }

      setMnemonics(libraryPayload.data || []);

      if (statsRes.ok && statsPayload?.success) {
        setStats({
          total_mnemonics: statsPayload.data?.total_mnemonics || 0,
          total_favorites: statsPayload.data?.total_favorites || 0,
          avg_effectiveness: Math.round(statsPayload.data?.avg_effectiveness || 0),
        });
      } else {
        const total = (libraryPayload.data || []).length;
        const favorites = (libraryPayload.data || []).filter((m: MnemonicUser) => m.favorito).length;
        setStats({
          total_mnemonics: total,
          total_favorites: favorites,
          avg_effectiveness: 0,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar mnemonicos:', err);
      setError('Nao foi possivel carregar os mnemonicos.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredMnemonics = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return mnemonics.filter((item) => {
      const m = item.mnemonico;
      const disciplineName = m.disciplina_id ? disciplines[m.disciplina_id] : '';
      const matchesDiscipline = selectedDiscipline === 'all'
        || (m.disciplina_id && m.disciplina_id === selectedDiscipline)
        || (disciplineName && disciplineName === selectedDiscipline);

      const haystack = [
        m.texto_principal,
        m.explicacao,
        m.subtopico,
        m.banca,
        m.tecnica,
        disciplineName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      return matchesDiscipline && matchesSearch;
    });
  }, [mnemonics, searchTerm, selectedDiscipline, disciplines]);

  const handleToggleFavorite = async (mnemonicoId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/mnemonics/${mnemonicoId}/favorite`, {
        method: 'POST',
        headers: authHeaders,
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload?.error || 'Erro ao favoritar');
      }
      setMnemonics((prev) =>
        prev.map((item) =>
          item.mnemonico_id === mnemonicoId
            ? { ...item, favorito: !item.favorito }
            : item
        )
      );
    } catch (err) {
      console.error('Erro ao favoritar:', err);
    }
  };

  const handleTrack = async (mnemonicoId: string, helped: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/mnemonics/${mnemonicoId}/track`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ajudou_lembrar: helped }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload?.error || 'Erro ao registrar uso');
      }
      try {
        await fetch(`${API_URL}/api/mnemonics/${mnemonicoId}/feedback`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ funcionaBem: helped, motivo: helped ? 'uso' : 'nao_ajudou' }),
        });
      } catch (err) {
        console.warn('Falha ao enviar feedback:', err);
      }
      setMnemonics((prev) =>
        prev.map((item) =>
          item.mnemonico_id === mnemonicoId
            ? { ...item, vezes_usado: item.vezes_usado + 1, funciona_bem: helped }
            : item
        )
      );
    } catch (err) {
      console.error('Erro ao registrar uso:', err);
    }
  };

  const handleRemove = async (mnemonicoId: string) => {
    if (!confirm('Remover este mnemonico da sua biblioteca?')) return;
    try {
      const res = await fetch(`${API_URL}/api/mnemonics/${mnemonicoId}/remove`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload?.error || 'Erro ao remover');
      }
      setMnemonics((prev) => prev.filter((item) => item.mnemonico_id !== mnemonicoId));
    } catch (err) {
      console.error('Erro ao remover:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setSubmitting(true);
      const isAi = formMode === 'ai';
      const payload = isAi
        ? {
            subtopico: formData.subtopico,
            conteudo: formData.conteudo,
            tecnica: formData.tecnica,
            disciplina_id: formData.disciplina_id || undefined,
            banca: formData.banca || undefined,
            estilo_cognitivo: formData.estilo_cognitivo || undefined,
            humor: formData.humor ? Number(formData.humor) : undefined,
            energia: formData.energia ? Number(formData.energia) : undefined,
            variacoes: Number(formData.variacoes) || 2,
          }
        : {
            tecnica: formData.tecnica,
            texto_principal: formData.texto_principal,
            explicacao: formData.explicacao || undefined,
            subtopico: formData.subtopico || undefined,
            disciplina_id: formData.disciplina_id || undefined,
            banca: formData.banca || undefined,
            nivel_dificuldade: Number(formData.nivel_dificuldade) || 1,
          };

      const res = await fetch(`${API_URL}/api/mnemonics${isAi ? '/generate' : ''}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Erro ao salvar mnemonico');
      }

      setFormData((prev) => ({
        ...prev,
        texto_principal: '',
        explicacao: '',
        subtopico: '',
        conteudo: '',
        banca: '',
      }));
      setFormOpen(false);
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar mnemonico:', err);
      setError('Nao foi possivel salvar o mnemonico.');
    } finally {
      setSubmitting(false);
    }
  };

  const buildTtsText = (mnemonico: Mnemonic, disciplina?: string) => {
    const parts = [
      mnemonico.texto_principal,
      mnemonico.explicacao || '',
      disciplina ? `Disciplina ${disciplina}` : '',
      mnemonico.subtopico ? `Contexto ${mnemonico.subtopico}` : '',
      mnemonico.banca ? `Banca ${mnemonico.banca}` : '',
      mnemonico.versoes_alternativas?.length ? `Variacoes: ${mnemonico.versoes_alternativas.join('; ')}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  };

  const handleTts = async (item: MnemonicUser, disciplina?: string) => {
    const ttsText = buildTtsText(item.mnemonico, disciplina);
    if (!ttsText) return;
    try {
      setTtsLoadingId(item.mnemonico_id);
      await playTts(ttsText);
    } catch (err) {
      console.error('Erro ao gerar audio:', err);
    } finally {
      setTtsLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <Card className="p-6 text-center">
          <p className="text-gray-600">Carregando mnemonicos...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadData}>
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Brain className="w-8 h-8 text-primary-600" />
            <span>Biblioteca de Mnenomicos</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Crie, guarde e evolua seus mnemonicos para memorizar mais rapido.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setFormOpen((prev) => !prev)}>
          <Plus className="w-4 h-4 mr-2" />
          {formOpen ? 'Fechar' : 'Novo mnemonico'}
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant={formMode === 'ai' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFormMode('ai')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar com IA
              </Button>
              <Button
                variant={formMode === 'manual' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFormMode('manual')}
              >
                Manual
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Subtopico</label>
                <input
                  value={formData.subtopico}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subtopico: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Ex: Principios da Administracao"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Disciplina</label>
                <select
                  value={formData.disciplina_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, disciplina_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {disciplineOptions.map((disc) => (
                    <option key={disc.id} value={disc.id}>{disc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {formMode === 'ai' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Conteudo base</label>
                  <textarea
                    value={formData.conteudo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, conteudo: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 h-28"
                    placeholder="Cole aqui o conteudo para gerar o mnemonico"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Tecnica</label>
                    <input
                      value={formData.tecnica}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tecnica: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="acronimo, historia, analogia..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Humor (0-10)</label>
                    <input
                      value={formData.humor}
                      onChange={(e) => setFormData((prev) => ({ ...prev, humor: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      type="number"
                      min="0"
                      max="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Energia (0-10)</label>
                    <input
                      value={formData.energia}
                      onChange={(e) => setFormData((prev) => ({ ...prev, energia: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      type="number"
                      min="0"
                      max="10"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Mnenomico</label>
                  <input
                    value={formData.texto_principal}
                    onChange={(e) => setFormData((prev) => ({ ...prev, texto_principal: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Ex: LIMPE"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Explicacao</label>
                  <textarea
                    value={formData.explicacao}
                    onChange={(e) => setFormData((prev) => ({ ...prev, explicacao: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 h-24"
                    placeholder="Explique como usar o mnemonico"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <BookMarked className="w-4 h-4" />
                {formMode === 'ai' ? 'Geracao com IA' : 'Criacao manual'}
              </div>
              <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card padding="md" className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {stats.total_mnemonics}
              </p>
            </div>
            <Brain className="w-10 h-10 text-blue-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Favoritos</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {stats.total_favorites}
              </p>
            </div>
            <Star className="w-10 h-10 text-purple-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Usos</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {mnemonics.reduce((sum, m) => sum + (m.vezes_usado || 0), 0)}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-600 opacity-80" />
          </div>
        </Card>

        <Card padding="md" className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Eficacia media</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {stats.avg_effectiveness.toFixed(0)}%
              </p>
            </div>
            <BookMarked className="w-10 h-10 text-orange-600 opacity-80" />
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar mnemonicos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Filtrar por disciplina"
          >
            <option value="all">Todas as disciplinas</option>
            {disciplineOptions.map((disc) => (
              <option key={disc.id} value={disc.id}>{disc.name}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMnemonics.map((item) => {
          const m = item.mnemonico;
          const disciplineName = m.disciplina_id ? disciplines[m.disciplina_id] : 'Geral';
          const difficulty = Math.max(1, Math.min(5, m.nivel_dificuldade || 1));
          return (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-2xl font-bold text-primary-600">
                      {m.texto_principal}
                    </h2>
                    {item.favorito && (
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="primary" size="sm">{disciplineName}</Badge>
                    {m.tecnica && <Badge variant="gray" size="sm">{m.tecnica}</Badge>}
                    <Badge variant="gray" size="sm">{'?'.repeat(difficulty)}</Badge>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900 font-medium leading-relaxed">
                  {m.explicacao || m.texto_principal}
                </p>
              </div>

              {m.subtopico && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 italic">
                    Contexto: {m.subtopico}
                  </p>
                </div>
              )}

              {m.versoes_alternativas && m.versoes_alternativas.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Variacoes:
                  </h3>
                  <ul className="space-y-1">
                    {m.versoes_alternativas.map((example, idx) => (
                      <li key={idx} className="text-sm text-gray-600 pl-4">
                        - {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Usado {item.vezes_usado} vezes</span>
                  {item.funciona_bem === true && <Badge variant="primary" size="sm">Funciona</Badge>}
                  {item.funciona_bem === false && <Badge variant="gray" size="sm">Precisa melhorar</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={item.favorito ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleFavorite(item.mnemonico_id)}
                  >
                    <Star className={`w-4 h-4 ${item.favorito ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTts(item, disciplineName)}
                    disabled={ttsLoadingId === item.mnemonico_id}
                    className="flex items-center gap-2"
                  >
                    <Volume2 className="w-4 h-4" />
                    {ttsLoadingId === item.mnemonico_id ? 'Carregando' : 'Ouvir'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTrack(item.mnemonico_id, true)}>
                    Ajudou
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTrack(item.mnemonico_id, false)}>
                    Nao ajudou
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(item.mnemonico_id)}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remover
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredMnemonics.length === 0 && (
        <Card className="text-center py-12 mt-6">
          <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhum mnemonico encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            Tente buscar por outros termos ou criar um novo mnemonico.
          </p>
          <Button variant="primary" size="md" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar meu primeiro mnemonico
          </Button>
        </Card>
      )}
    </div>
  );
}
