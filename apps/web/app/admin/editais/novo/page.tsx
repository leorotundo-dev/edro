'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, ApiResponse } from '@/lib/api';

export default function NovoEditalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        numero_vagas: parseInt(formData.numero_vagas.toString()),
        taxa_inscricao: parseFloat(formData.taxa_inscricao.toString()),
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        cargos: cargos.filter((c) => c.nome),
        disciplinas: disciplinas.filter((d) => d.nome),
      };

      const data = await apiPost<ApiResponse<{ id: string }>>('/editais', payload);

      if (data.success && data.data) {
        alert('Edital criado com sucesso!');
        router.push(`/admin/editais/${data.data.id}`);
      } else {
        alert('Erro: ' + (data.error || data.message || 'Resposta inválida'));
      }
    } catch (error) {
      console.error('Erro ao criar edital:', error);
      alert('Erro ao criar edital');
    } finally {
      setLoading(false);
    }
  };

  const addCargo = () => {
    setCargos([...cargos, { nome: '', vagas: 0, salario: 0, requisitos: '' }]);
  };

  const addDisciplina = () => {
    setDisciplinas([...disciplinas, { nome: '', peso: 1, numero_questoes: 0 }]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Novo Edital</h1>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Vagas
                </label>
                <input
                  type="number"
                  value={formData.numero_vagas}
                  onChange={(e) => setFormData({ ...formData, numero_vagas: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  onChange={(e) => setFormData({ ...formData, taxa_inscricao: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Adicionar Cargo
              </button>
            </div>
            {cargos.map((cargo, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded">
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
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Vagas"
                    value={cargo.vagas}
                    onChange={(e) => {
                      const newCargos = [...cargos];
                      newCargos[index].vagas = parseInt(e.target.value);
                      setCargos(newCargos);
                    }}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Salário"
                    value={cargo.salario}
                    onChange={(e) => {
                      const newCargos = [...cargos];
                      newCargos[index].salario = parseFloat(e.target.value);
                      setCargos(newCargos);
                    }}
                    className="w-full px-4 py-2 border rounded"
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
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Adicionar Disciplina
              </button>
            </div>
            {disciplinas.map((disc, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded">
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
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Peso"
                    value={disc.peso}
                    onChange={(e) => {
                      const newDisc = [...disciplinas];
                      newDisc[index].peso = parseFloat(e.target.value);
                      setDisciplinas(newDisc);
                    }}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Nº Questões"
                    value={disc.numero_questoes}
                    onChange={(e) => {
                      const newDisc = [...disciplinas];
                      newDisc[index].numero_questoes = parseInt(e.target.value);
                      setDisciplinas(newDisc);
                    }}
                    className="w-full px-4 py-2 border rounded"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Criar Edital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
