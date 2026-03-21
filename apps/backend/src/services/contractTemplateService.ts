/**
 * Generates the freelancer PJ service contract as a PDF buffer using pdfkit.
 * Called before uploading to D4Sign.
 */

import PDFDocument from 'pdfkit';

export interface ContractData {
  // Agência
  agency_razao_social: string;
  agency_cnpj: string;
  agency_address: string;
  agency_city_state: string;
  agency_representative: string;
  agency_cpf: string;

  // Fornecedor
  razao_social: string;
  cnpj: string;
  nome_fantasia?: string | null;
  address_street: string;
  address_number: string;
  address_complement?: string | null;
  address_district: string;
  address_city: string;
  address_state: string;
  address_cep: string;
  representante_nome: string;
  representante_cpf: string;
  estado_civil?: string | null;

  // Data
  contract_date: string; // "dd/mm/yyyy"
}

function formatCnpj(raw: string): string {
  const c = raw.replace(/\D/g, '');
  return c.length === 14
    ? `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`
    : raw;
}

function formatCpf(raw: string): string {
  const c = raw.replace(/\D/g, '');
  return c.length === 11
    ? `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9)}`
    : raw;
}

export async function generateContractPdf(data: ContractData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PRI = '#1a1a2e';
    const GRY = '#555555';
    const LGT = '#888888';

    // ── Header ─────────────────────────────────────────────────────────────────
    doc
      .fontSize(18).fillColor(PRI).font('Helvetica-Bold')
      .text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', { align: 'center' })
      .moveDown(0.3)
      .fontSize(10).fillColor(GRY).font('Helvetica')
      .text('Contrato B2B entre Pessoas Jurídicas — Lei 10.406/2002', { align: 'center' })
      .moveDown(0.5);

    // Divider
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke().moveDown(1);

    // ── Partes ─────────────────────────────────────────────────────────────────
    section(doc, '1. QUALIFICAÇÃO DAS PARTES', PRI);

    subsection(doc, 'CONTRATANTE', GRY);
    body(doc, `Razão Social: ${data.agency_razao_social}`);
    body(doc, `CNPJ: ${formatCnpj(data.agency_cnpj)}`);
    body(doc, `Endereço: ${data.agency_address} — ${data.agency_city_state}`);
    body(doc, `Representante: ${data.agency_representative} — CPF: ${formatCpf(data.agency_cpf)}`);
    doc.moveDown(0.5);

    subsection(doc, 'CONTRATADA (FORNECEDOR)', GRY);
    body(doc, `Razão Social: ${data.razao_social}${data.nome_fantasia ? ` (${data.nome_fantasia})` : ''}`);
    body(doc, `CNPJ: ${formatCnpj(data.cnpj)}`);
    const addr = [
      data.address_street,
      data.address_number,
      data.address_complement,
      data.address_district,
      `${data.address_city}/${data.address_state}`,
      `CEP ${data.address_cep}`,
    ].filter(Boolean).join(', ');
    body(doc, `Endereço: ${addr}`);
    body(doc, `Representante: ${data.representante_nome} — CPF: ${formatCpf(data.representante_cpf)}${data.estado_civil ? ` — ${data.estado_civil}` : ''}`);
    doc.moveDown(1);

    // ── Cláusulas ──────────────────────────────────────────────────────────────
    section(doc, '2. NATUREZA DA RELAÇÃO', PRI);
    body(doc,
      '2.1. A presente relação é de natureza estritamente CIVIL/COMERCIAL, regida pelo Código Civil ' +
      '(Lei 10.406/2002) e pela Lei 13.429/2017. NÃO EXISTE qualquer relação de emprego, vínculo empregatício, ' +
      'subordinação jurídica, pessoalidade ou habitualidade caracterizadoras de relação de trabalho (CLT) entre as partes.');
    doc.moveDown(0.5);
    body(doc,
      '2.2. A CONTRATADA atua como empresa autônoma e independente, podendo prestar serviços para terceiros, ' +
      'inclusive concorrentes da CONTRATANTE, salvo disposição expressa em contrário em instrumento específico.');
    doc.moveDown(1);

    section(doc, '3. OBJETO E ENTREGA', PRI);
    body(doc,
      '3.1. A CONTRATADA se compromete a entregar escopos de trabalho aceitos dentro dos prazos (SLA) definidos ' +
      'em cada Aceite de Escopo, que integra este contrato.');
    doc.moveDown(0.5);
    body(doc,
      '3.2. A plataforma NÃO registra horas trabalhadas, localização geográfica, uso de dispositivo, ' +
      'horário de acesso nem qualquer dado que configure controle de jornada.');
    doc.moveDown(1);

    section(doc, '4. REMUNERAÇÃO E HONORÁRIOS', PRI);
    body(doc,
      '4.1. Os honorários são calculados por escopo entregue, conforme valores acordados no Aceite de Escopo.');
    doc.moveDown(0.5);
    body(doc,
      '4.2. O pagamento é realizado exclusivamente para a Pessoa Jurídica (CNPJ) da CONTRATADA, via PIX ou ' +
      'transferência para conta vinculada ao CNPJ, até o dia 10 do mês subsequente à entrega aprovada, ' +
      'condicionado à emissão de Nota Fiscal de Serviços (NFS-e).');
    doc.moveDown(0.5);
    body(doc,
      '4.3. É vedado o pagamento a CPF. Poderá ser aplicada Glosa proporcional nos casos de descumprimento de SLA.');
    doc.moveDown(1);

    section(doc, '5. SCORE DO FORNECEDOR', PRI);
    body(doc,
      '5.1. A plataforma mantém um Score do Fornecedor (0–100) baseado no histórico de cumprimento de SLAs. ' +
      'O score influencia a prioridade de oferta de novos escopos (≥90: prioridade máxima; 75–89: boa preferência; ' +
      '60–74: normal; <60: restrição temporária).');
    doc.moveDown(1);

    section(doc, '6. DADOS E PRIVACIDADE (LGPD)', PRI);
    body(doc,
      '6.1. Os dados cadastrais da CONTRATADA são utilizados exclusivamente para fins de contratação, ' +
      'faturamento e cumprimento de obrigações legais, nos termos da Lei 13.709/2018 (LGPD).');
    doc.moveDown(0.5);
    body(doc,
      '6.2. Dados de rastreamento de localização, biometria, monitoramento de dispositivo ou controle de ' +
      'jornada NÃO são coletados.');
    doc.moveDown(1);

    section(doc, '7. VIGÊNCIA E RESCISÃO', PRI);
    body(doc,
      '7.1. Vigência de 12 meses a partir da assinatura, renovável automaticamente. ' +
      'Rescisão mediante aviso prévio de 30 dias por qualquer das partes, sem ônus, desde que não haja escopos em aberto.');
    doc.moveDown(1);

    section(doc, '8. FORO', PRI);
    body(doc,
      '8.1. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias.');
    doc.moveDown(2);

    // ── Assinaturas ────────────────────────────────────────────────────────────
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke().moveDown(1);

    doc
      .fontSize(10).fillColor(LGT)
      .text(`São Paulo, ${data.contract_date}`, { align: 'center' })
      .moveDown(2);

    // Two columns for signatures
    const pageWidth = 535 - 60;
    const colW = pageWidth / 2 - 20;
    const leftX = 60;
    const rightX = 60 + colW + 40;
    const sigY = doc.y;

    // Left: CONTRATANTE
    doc.moveTo(leftX, sigY + 40).lineTo(leftX + colW, sigY + 40).stroke();
    doc.fontSize(9).fillColor(PRI).font('Helvetica-Bold')
      .text('CONTRATANTE', leftX, sigY + 44, { width: colW, align: 'center' });
    doc.fontSize(8).fillColor(GRY).font('Helvetica')
      .text(data.agency_razao_social, leftX, sigY + 56, { width: colW, align: 'center' })
      .text(`CNPJ: ${formatCnpj(data.agency_cnpj)}`, leftX, doc.y, { width: colW, align: 'center' });

    // Right: CONTRATADA
    doc.moveTo(rightX, sigY + 40).lineTo(rightX + colW, sigY + 40).stroke();
    doc.fontSize(9).fillColor(PRI).font('Helvetica-Bold')
      .text('CONTRATADA (FORNECEDOR)', rightX, sigY + 44, { width: colW, align: 'center' });
    doc.fontSize(8).fillColor(GRY).font('Helvetica')
      .text(data.razao_social, rightX, sigY + 56, { width: colW, align: 'center' })
      .text(`CNPJ: ${formatCnpj(data.cnpj)}`, rightX, doc.y, { width: colW, align: 'center' });

    doc.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function section(doc: PDFKit.PDFDocument, title: string, color: string) {
  doc.fontSize(11).fillColor(color).font('Helvetica-Bold').text(title).moveDown(0.4);
}

function subsection(doc: PDFKit.PDFDocument, title: string, color: string) {
  doc.fontSize(9).fillColor(color).font('Helvetica-Bold').text(title).moveDown(0.3);
}

function body(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(9).fillColor('#333333').font('Helvetica').text(text, { lineGap: 2 }).moveDown(0.3);
}
