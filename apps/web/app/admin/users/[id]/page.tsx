
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "../../../../lib/api";
import type { ApiResponse } from "../../../../lib/api";
import {
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

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  suspended: "bg-red-100 text-red-700",
  default: "bg-slate-100 text-slate-700"
};

const PLAN_STYLES: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  basic: "bg-blue-100 text-blue-700",
  premium: "bg-purple-100 text-purple-700",
  enterprise: "bg-indigo-100 text-indigo-700",
  default: "bg-slate-100 text-slate-700"
};

export default function UserDetailPageComplete() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'subscription' | 'educational' | 'management'>(
    'subscription'
  );

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      if (!userId) return;
      setLoading(true);
      setError(null);

      try {
        const response = await apiGet<ApiResponse<UserDetail>>(`/admin/users/${userId}`);
        if (!response?.success || !response.data) {
          throw new Error(response?.error || 'Usuário não encontrado');
        }

        if (!isMounted) return;
        setUser({
          ...response.data,
          name: response.data.name ?? response.data.email?.split('@')[0] ?? 'Usuário'
        });
      } catch (err) {
        console.error('Erro ao buscar usuário:', err);
        if (!isMounted) return;
        setUser(null);
        setError(err instanceof Error ? err.message : 'Erro ao carregar usuário');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUser();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const tabs = [
    { id: 'subscription', label: 'Assinatura & Pagamentos', icon: CreditCard },
    { id: 'educational', label: 'Progresso Educacional', icon: GraduationCap },
    { id: 'management', label: 'Gestão & Admin', icon: Shield }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando usuário...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Não foi possível carregar o usuário</h1>
        <p className="text-sm text-slate-600">{error}</p>
        <button
          onClick={() => router.push('/admin/users')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Voltar para Usuários
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Usuário não encontrado</h1>
        <p className="text-sm text-slate-600">O usuário que você procurou não existe ou foi removido.</p>
        <button
          onClick={() => router.push('/admin/users')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Voltar para Usuários
        </button>
      </div>
    );
  }

  const statusKey = (user.status ?? 'default').toLowerCase();
  const planKey = (user.plan ?? 'free').toLowerCase();
  const statusClass = STATUS_STYLES[statusKey] ?? STATUS_STYLES.default;
  const planClass = PLAN_STYLES[planKey] ?? PLAN_STYLES.default;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/admin/users')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar para Usuários</span>
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name ?? user.email} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{user.name || 'Sem nome'}</h1>
                <span className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${statusClass}`}>
                  {user.status ? user.status : 'Sem status'}
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full uppercase ${planClass}`}>
                  {(user.plan ?? 'FREE').toUpperCase()}
                </span>
              </div>

              {user.bio && <p className="text-sm text-slate-600 mb-4">{user.bio}</p>}

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

          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 transition-colors">
            <Edit className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>

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

      <div>
        {activeTab === 'subscription' && <SubscriptionSection userId={userId} />}
        {activeTab === 'educational' && <EducationalSection userId={userId} />}
        {activeTab === 'management' && <ManagementSection userId={userId} />}
      </div>
    </div>
  );
}
