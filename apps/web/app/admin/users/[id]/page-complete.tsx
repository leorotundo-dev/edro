"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "../../../../lib/api";
import {
  User,
  ArrowLeft,
  CreditCard,
  GraduationCap,
  Shield,
  Mail,
  Calendar,
  MapPin,
  Phone,
  Edit
} from "lucide-react";
import {
  SubscriptionSection,
  EducationalSection,
  ManagementSection
} from "./UserDetailSections";

interface UserDetail {
  id: string;
  email: string;
  name?: string;
  bio?: string;
  avatar_url?: string;
  role?: string;
  status?: string;
  plan?: string;
  created_at?: string;
  updated_at?: string;
  phone?: string;
  location?: string;
}

export default function UserDetailPageComplete() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subscription' | 'educational' | 'management'>('subscription');

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        const data = await apiGet(`/admin/users/${userId}`);
        setUser(data);
      } catch (e) {
        console.error("Erro ao buscar usuário:", e);
        // Mock data para desenvolvimento
        setUser({
          id: userId,
          email: 'joao.silva@email.com',
          name: 'João Silva',
          bio: 'Estudante de concursos públicos focado em carreiras jurídicas.',
          role: 'user',
          status: 'active',
          plan: 'premium',
          phone: '(11) 98765-4321',
          location: 'São Paulo, SP',
          created_at: '2024-11-15T10:00:00Z',
          updated_at: '2025-01-06T14:30:00Z'
        });
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando usuário...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Usuário não encontrado</h1>
        <p className="text-sm text-slate-600">O usuário que você está procurando não existe ou foi removido.</p>
        <button
          onClick={() => router.push('/admin/users')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Voltar para Usuários
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'subscription', label: 'Assinatura & Pagamentos', icon: CreditCard },
    { id: 'educational', label: 'Progresso Educacional', icon: GraduationCap },
    { id: 'management', label: 'Gestão & Admin', icon: Shield }
  ];

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700'
  };

  const planColors = {
    free: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    premium: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-indigo-100 text-indigo-700'
  };

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <button
        onClick={() => router.push('/admin/users')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar para Usuários</span>
      </button>

      {/* Header - Informações do Usuário */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{user.name || 'Sem nome'}</h1>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[user.status as keyof typeof statusColors] || statusColors.active}`}>
                  {user.status === 'active' ? 'Ativo' : user.status}
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${planColors[user.plan as keyof typeof planColors] || planColors.free}`}>
                  {user.plan?.toUpperCase() || 'FREE'}
                </span>
              </div>

              {user.bio && (
                <p className="text-sm text-slate-600 mb-4">{user.bio}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{user.location}</span>
                  </div>
                )}
                {user.created_at && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>Desde {new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 transition-colors">
            <Edit className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'subscription' && <SubscriptionSection userId={userId} />}
        {activeTab === 'educational' && <EducationalSection userId={userId} />}
        {activeTab === 'management' && <ManagementSection userId={userId} />}
      </div>
    </div>
  );
}
