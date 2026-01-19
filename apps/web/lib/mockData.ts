// Dados mock para desenvolvimento
export const mockMetrics = {
  overview: {
    totalUsers: 42,
    totalDrops: 156,
    totalDisciplines: 12,
    totalReviews: 89,
    costThisMonth: 18.14,
    costBreakdown: {
      railway: 18.14,
      vercel: 0,
      openai: 0
    }
  }
};

export const mockCosts = {
  real: {
    overview: {
      thisMonth: 18.14,
      lastMonth: 15.50,
      trend: 17.1,
      breakdown: {
        railway: {
          total: 18.14,
          compute: 9.00,
          storage: 5.00,
          network: 2.00,
          database: 2.14
        },
        vercel: {
          total: 0,
          bandwidth: 0,
          functions: 0
        },
        openai: {
          total: 0,
          tokens: 0
        }
      }
    }
  }
};

export const mockDrops = {
  drops: [
    {
      id: "1",
      title: "Introdução ao React",
      description: "Aprenda os conceitos básicos do React",
      category: "Frontend",
      difficulty: "Iniciante",
      createdAt: "2024-01-15",
      updatedAt: "2024-01-20"
    },
    {
      id: "2",
      title: "TypeScript Avançado",
      description: "Tipos avançados e genéricos em TypeScript",
      category: "Backend",
      difficulty: "Avançado",
      createdAt: "2024-01-10",
      updatedAt: "2024-01-18"
    },
    {
      id: "3",
      title: "Banco de Dados SQL",
      description: "Queries SQL e otimização de performance",
      category: "Database",
      difficulty: "Intermediário",
      createdAt: "2024-01-05",
      updatedAt: "2024-01-22"
    }
  ]
};

export const mockUsers = {
  users: [
    {
      id: "1",
      name: "João Silva",
      email: "joao@example.com",
      plan: "Pro",
      createdAt: "2024-01-01",
      status: "active"
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@example.com",
      plan: "Free",
      createdAt: "2024-01-05",
      status: "active"
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro@example.com",
      plan: "Turbo",
      createdAt: "2024-01-10",
      status: "active"
    }
  ]
};

export const mockBlueprints = {
  blueprints: []
};

export const mockHarvest = {
  items: []
};

export const mockRAG = {
  blocks: []
};
