/**
 * Omie API v1 Client
 * Docs: https://developer.omie.com.br/service-list/
 * Base URL: https://app.omie.com.br/api/v1/
 *
 * Auth: app_key + app_secret enviados no body de cada request.
 * Todas as chamadas são POST com JSON: { call, app_key, app_secret, param: [...] }
 *
 * Env vars:
 *   OMIE_APP_KEY    — chave da integração
 *   OMIE_APP_SECRET — segredo da integração
 *   OMIE_BASE_URL   — opcional, default https://app.omie.com.br/api/v1
 */

export type OmieConfig = {
  appKey?: string;
  appSecret?: string;
  baseUrl?: string;
};

const DEFAULT_BASE_URL = 'https://app.omie.com.br/api/v1';

// ── Data types ─────────────────────────────────────────────────────────────

export type OmieClienteData = {
  razao_social: string;
  cnpj_cpf?: string;
  email?: string;
  telefone1_numero?: string;
  endereco?: string;
  endereco_numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  codigo_cliente_integracao?: string; // our internal client id
};

export type OmieOSData = {
  cabecalho: {
    cCodIntOS: string;           // our briefing/invoice id
    cCodParc: string;            // parcela "001"
    dDtPrevisao: string;         // DD/MM/YYYY
    nCodCli: number;             // omie_client_id
    cEtapa: string;              // '10' = Em Aberto
  };
  servicos: Array<{
    cCodServico: string;         // código do serviço cadastrado no Omie
    cDescricao: string;
    nQtde: number;
    nValUnit: number;
  }>;
  infAdic?: {
    cNomeContato?: string;
    cEmailContato?: string;
    cObs?: string;
  };
};

// ── Client class ────────────────────────────────────────────────────────────

export class OmieClient {
  private appKey: string;
  private appSecret: string;
  private baseUrl: string;

  constructor(overrides?: OmieConfig) {
    this.appKey    = overrides?.appKey    ?? process.env.OMIE_APP_KEY    ?? '';
    this.appSecret = overrides?.appSecret ?? process.env.OMIE_APP_SECRET ?? '';
    this.baseUrl   = (overrides?.baseUrl  ?? process.env.OMIE_BASE_URL   ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  ok(): boolean {
    return Boolean(this.appKey && this.appSecret);
  }

  private async call(endpoint: string, callName: string, param: object[]): Promise<any> {
    if (!this.ok()) throw new Error('Omie credentials not configured (OMIE_APP_KEY / OMIE_APP_SECRET)');

    const url = `${this.baseUrl}/${endpoint}`;
    const body = {
      call:       callName,
      app_key:    this.appKey,
      app_secret: this.appSecret,
      param,
    };

    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok || data?.faultstring) {
      const msg = data?.faultstring ?? data?.descricao_status ?? text;
      throw new Error(`Omie ${callName} → ${res.status}: ${msg}`);
    }

    return data;
  }

  // ── Clientes ────────────────────────────────────────────────────────────

  async incluirCliente(data: OmieClienteData): Promise<{ codigo_cliente_omie: number; codigo_cliente_integracao: string }> {
    return this.call('geral/clientes/', 'IncluirCliente', [data]);
  }

  async alterarCliente(data: OmieClienteData & { codigo_cliente_omie: number }): Promise<any> {
    return this.call('geral/clientes/', 'AlterarCliente', [data]);
  }

  async consultarCliente(params: { codigo_cliente_omie?: number; codigo_cliente_integracao?: string }): Promise<any> {
    return this.call('geral/clientes/', 'ConsultarCliente', [params]);
  }

  async listarClientes(params: { pagina?: number; registros_por_pagina?: number; filtrar_apenas_ativo?: 'S' | 'N' } = {}): Promise<any> {
    return this.call('geral/clientes/', 'ListarClientes', [{ pagina: 1, registros_por_pagina: 50, ...params }]);
  }

  // ── Ordens de Serviço ────────────────────────────────────────────────────

  async incluirOS(data: OmieOSData): Promise<{ nCodOS: number; cCodIntOS: string }> {
    return this.call('os/servicos/', 'IncluirOS', [data]);
  }

  async consultarOS(params: { nCodOS?: number; cCodIntOS?: string }): Promise<any> {
    return this.call('os/servicos/', 'ConsultarOS', [params]);
  }

  async listarOS(params: { nCodCli?: number; cEtapa?: string; pagina?: number } = {}): Promise<any> {
    return this.call('os/servicos/', 'ListarOS', [{ pagina: 1, registros_por_pagina: 50, ...params }]);
  }

  async alterarStatusOS(nCodOS: number, cStatus: string): Promise<any> {
    return this.call('os/servicos/', 'TrocarEtapaOS', [{ nCodOS, cEtapa: cStatus }]);
  }

  // ── NFS-e ────────────────────────────────────────────────────────────────

  /**
   * Emite NFS-e a partir de uma OS concluída.
   * Requer que a OS esteja em etapa '50' (Concluída) ou '70' (Faturado).
   */
  async emitirNFSe(nCodOS: number): Promise<{ nCodNFe: number; nNumNFe: number; cSitNFe: string }> {
    return this.call('os/servicos/', 'EmitirNfse', [{ nCodOS }]);
  }

  async consultarNFSe(nCodNFe: number): Promise<any> {
    return this.call('os/servicos/', 'ConsultarNFSe', [{ nCodNFe }]);
  }

  async cancelarNFSe(nCodNFe: number, motivo: string): Promise<any> {
    return this.call('os/servicos/', 'CancelarNFSe', [{ nCodNFe, motivo }]);
  }

  // ── Categorias / Departamentos (lookup) ─────────────────────────────────

  async listarCategorias(): Promise<any> {
    return this.call('geral/categorias/', 'ListarCategorias', [{ pagina: 1, registros_por_pagina: 100 }]);
  }

  async listarDepartamentos(): Promise<any> {
    return this.call('geral/departamentos/', 'ListarDepartamentos', [{ pagina: 1, registros_por_pagina: 100 }]);
  }
}

// Singleton
export const omieClient = new OmieClient();
