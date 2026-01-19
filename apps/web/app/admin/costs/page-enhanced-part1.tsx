"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";
import {
  DollarSign, TrendingUp, TrendingDown, Server, Cloud, Database, Zap,
  CreditCard, Calendar, Activity, AlertCircle, CheckCircle, ExternalLink, Download, RefreshCw
} from "lucide-react";

interface ServiceCost {
  name: string;
  category: 'infrastructure' | 'ai' | 'payment' | 'monitoring' | 'other';
  cost: number;
  billing: 'monthly' | 'usage' | 'annually';
  status: 'active' | 'inactive' | 'trial';
  limit?: number;
  usage?: number;
  url?: string;
  items?: Array<{ name: string; cost: number }>;
}

export default function CostsPageEnhanced() {
  const [services, setServices] = useState<ServiceCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await apiGet("/admin/costs/real/overview");
        // Process API data...
      } catch (e) {
        console.error("Erro ao buscar custos:", e);
        
        // Mock data completo
        setServices([
          // Infraestrutura
          {
            name: "Railway",
            category: "infrastructure",
            cost: 125.00,
            billing: "monthly",
            status: "active",
            url: "https://railway.app",
            items: [
              { name: "Backend API", cost: 45.00 },
              { name: "PostgreSQL Database", cost: 35.00 },
              { name: "Redis Cache", cost: 25.00 },
              { name: "Storage", cost: 15.00 },
              { name: "Network", cost: 5.00 }
            ]
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Custos e Assinaturas</h1>
    </div>
  );
}
