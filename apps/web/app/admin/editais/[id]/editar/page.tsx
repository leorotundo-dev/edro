'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPut, ApiResponse } from '@/lib/api';
import { ArrowLeft, Save, X } from 'lucide-react';

interface Edital {
  id: string;
  codigo: string;
  titulo: string;
  orgao: string;
  banca?: string;
  status: string;
  data_publicacao?: string;
  data_inscricao_inicio?: string;
  data_inscricao_fim?: string;
  data_prova_prevista?: string;
  descricao?: string;
  link_edital_completo?: string;
  link_inscricao?: string;
  numero_vagas: number;
  taxa_inscricao?: number;
  tags?: string[];
  observacoes?: string;
  cargos?: any[];
  disciplinas?: any[];
}

export default function EditarEditalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edital, setEdital] = useState<Edital | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    titulo: '',
    orgao: '',
    banca: '',
    status: 'rascunho',
    data_publicacao: '',
    data_inscricao_inicio: '',
    data_inscricao_fim: '',
    data_prova_prevista: '',
    descricao: '',
    link_edital_completo: '',
    link_inscricao: '',
    numero_vagas: 0,
    taxa_inscricao: 0,
    tags: '',
    observacoes: '',
  });

  const [cargos, setCargos] = useState([{ nome: '', vagas: 0, salario: 0, requisitos: '' }]);
  const [disciplinas, setDisciplinas] = useState([{ nome: '', peso: 1, numero_questoes: 0 }]);

  useEffect(() => {
    if (id) {
      loadEdital();
    }
  }, [id]);

  const loadEdital = async () => {
    try {
      setLoading(true);
      const response = await apiGet<ApiResponse<Edital>>(`/editais/${id}`);

      if (response.success && response.data) {
        const editalData = response.data;
        setEdital(editalData);
        
        // Populate form
        setFormData({
          codigo: editalData.codigo || '',
          titulo: editalData.titulo || '',
          orgao: editalData.orgao || '',
          banca: editalData.banca || '',
          status: editalData.status || 'rascunho',
          data_publicacao: editalData.data_publicacao ? editalData.data_publicacao.split('T')[0] : '',
          data_inscricao_inicio: editalData.data_inscricao_inicio ? editalData.data_inscricao_inicio.split('T')[0] : '',
          data_inscricao_fim: editalData.data_inscricao_fim ? editalData.data_inscricao_fim.split('T')[0] : '',
          data_prova_prevista: editalData.data_prova_prevista ? editalData.data_prova_prevista.split('T')[0] : '',
          descricao: editalData.descricao || '',
          link_edital_completo: editalData.link_edital_completo || '',
          link_inscricao: editalData.link_inscricao || '',
          numero_vagas: editalData.numero_vagas || 0,
          taxa_inscricao: editalData.taxa_inscricao || 0,
          tags: Array.isArray(editalData.tags) ? editalData.tags.join(', ') : '',
          observacoes: editalData.observacoes || '',
        });

        if (editalData.cargos && editalData.cargos.length > 0) {
          setCargos(editalData.cargos);
        }

        if (editalData.disciplinas && editalData.disciplinas.length > 0) {
          setDisciplinas(editalData.disciplinas);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar edital:', error);
      alert('Erro ao carregar edital');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        numero_vagas: parseInt(formData.numero_vagas.toString()),
        taxa_inscricao: parseFloat(formData.taxa_inscricao.toString()) || 0,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        cargos: cargos.filter((c) => c.nome),
        disciplinas: disciplinas.filter((d) => d.nome),
      };

      const data = await apiPut<ApiResponse<Edital>>(`/editais/${id}`, payload);

      if (data.success) {
        alert('Edital atualizado com sucesso!');
        router.push(`/admin/editais/${id}`);
      } else {
        alert('Erro: ' + (data.error || data.message || 'Resposta inválida'));
      }
    } catch (error) {
      console.error('Erro ao atualizar edital:', error);
      alert('Erro ao atualizar edital');
    } finally {
      setSaving(false);
    }
  };

  const addCargo = () => {
    setCargos([...cargos, { nome: '', vagas: 0, salario: 0, requisitos: '' }]);
  };

  const removeCargo = (index: number) => {
    setCargos(cargos.filter((_, i) => i !== index));
  };

  const addDisciplina = () => {
    setDisciplinas([...disciplinas, { nome: '', peso: 1, numero_questoes: 0 }]);
  };

  const removeDisciplina = (index: number) => {
    setDisciplinas(disciplinas.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando edital...</p>
        </div>
      </div>
    );
  }

  if (!edital) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-red-600">Edital não encontrado</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-600">
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Editar Edital</h1>
          <p className="text-gray-600 mt-2">Código: {formData.codigo}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Informações Básicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  required
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="publicado">Publicado</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Órgão *
                </label>
                <input
                  type="text"
                  required
                  value={formData.orgao}
                  onChange={(e) => setFormData({ ...formData, orgao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banca
                </label>
                <input
                  type="text"
                  value={formData.banca}
                  onChange={(e) => setFormData({ ...formData, banca: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Vagas
                </label>
                <input
                  type="number"
                  value={formData.numero_vagas}
                  onChange={(e) => setFormData({ ...formData, numero_vagas: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Inscrição (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.taxa_inscricao}
                  onChange={(e) => setFormData({ ...formData, taxa_inscricao: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Datas Importantes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Publicação
                </label>
                <input
                  type="date"
                  value={formData.data_publicacao}
                  onChange={(e) => setFormData({ ...formData, data_publicacao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data da Prova Prevista
                </label>
                <input
                  type="date"
                  value={formData.data_prova_prevista}
                  onChange={(e) => setFormData({ ...formData, data_prova_prevista: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início das Inscrições
                </label>
                <input
                  type="date"
                  value={formData.data_inscricao_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inscricao_inicio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fim das Inscrições
                </label>
                <input
                  type="date"
                  value={formData.data_inscricao_fim}
                  onChange={(e) => setFormData({ ...formData, data_inscricao_fim: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Cargos */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Cargos</h2>
              <button
                type="button"
                onClick={addCargo}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                + Adicionar Cargo
              </button>
            </div>
            {cargos.map((cargo, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg relative">
                <button
                  type="button"
                  onClick={() => removeCargo(index)}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Nome do cargo"
                    value={cargo.nome}
                    onChange={(e) => {
                      const newCargos = [...cargos];
                      newCargos[index].nome = e.target.value;
                      setCargos(newCargos);
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Vagas"
                    value={cargo.vagas}
                    onChange={(e) => {
                      const newCargos = [...cargos];
                      newCargos[index].vagas = parseInt(e.target.value) || 0;
                      setCargos(newCargos);
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Salário"
                    value={cargo.salario}
                    onChange={(e) => {
                      const newCargos = [...cargos];
                      newCargos[index].salario = parseFloat(e.target.value) || 0;
                      setCargos(newCargos);
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-4">
                  <textarea
                    placeholder="Requisitos"
                    value={cargo.requisitos}
                    onChange={(e) => {
                      const newCargos = [...cargos];
                      newCargos[index].requisitos = e.target.value;
                      setCargos(newCargos);
                    }}
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Disciplinas */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Disciplinas</h2>
              <button
                type="button"
                onClick={addDisciplina}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                + Adicionar Disciplina
              </button>
            </div>
            {disciplinas.map((disc, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded-lg relative">
                <button
                  type="button"
                  onClick={() => removeDisciplina(index)}
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
                <div>
                  <input
                    type="text"
                    placeholder="Nome da disciplina"
                    value={disc.nome}
                    onChange={(e) => {
                      const newDisc = [...disciplinas];
                      newDisc[index].nome = e.target.value;
                      setDisciplinas(newDisc);
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Peso"
                    value={disc.peso}
                    onChange={(e) => {
                      const newDisc = [...disciplinas];
                      newDisc[index].peso = parseFloat(e.target.value) || 1;
                      setDisciplinas(newDisc);
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Nº Questões"
                    value={disc.numero_questoes}
                    onChange={(e) => {
                      const newDisc = [...disciplinas];
                      newDisc[index].numero_questoes = parseInt(e.target.value) || 0;
                      setDisciplinas(newDisc);
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Descrição e Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Informações Adicionais</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  rows={4}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link do Edital Completo
                </label>
                <input
                  type="url"
                  value={formData.link_edital_completo}
                  onChange={(e) => setFormData({ ...formData, link_edital_completo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link de Inscrição
                </label>
                <input
                  type="url"
                  value={formData.link_inscricao}
                  onChange={(e) => setFormData({ ...formData, link_inscricao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="federal, tecnologia, nivel-superior"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
