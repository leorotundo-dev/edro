/**
 * Generates the freelancer PJ service contract as a PDF buffer using pdfkit.
 * Called before uploading to D4Sign.
 *
 * Contract version: 2026-03 (final reviewed)
 * Covers: natureza jurídica, multicliente, meios próprios, glosa, PI, IA, NDA,
 *         isenção de Clientes Finais, LGPD, vigência expressa.
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
  pix_key?: string | null;
  pix_key_type?: 'cnpj' | 'cpf' | 'email' | 'telefone' | 'aleatoria' | string | null;
  bank_name?: string | null;
  bank_agency?: string | null;
  bank_account?: string | null;

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

function cityStateOnly(cityState: string): string {
  return cityState.split('—').pop()?.trim() ?? cityState;
}

function pixKeyTypeLabel(type?: string | null): string {
  switch (type) {
    case 'cnpj': return 'CNPJ';
    case 'cpf': return 'CPF';
    case 'email': return 'E-mail';
    case 'telefone': return 'Telefone';
    case 'aleatoria': return 'Chave aleatória';
    default: return 'Chave PIX';
  }
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

    const foroCidade = cityStateOnly(data.agency_city_state);

    // ── Header ─────────────────────────────────────────────────────────────────
    doc
      .fontSize(18).fillColor(PRI).font('Helvetica-Bold')
      .text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', { align: 'center' })
      .moveDown(0.3)
      .fontSize(9).fillColor(GRY).font('Helvetica')
      .text(
        'Contrato B2B entre Pessoas Jurídicas — Código Civil (Lei 10.406/2002) · ' +
        'Art. 442-B CLT (Lei 13.467/2017) · Lei 9.610/1998 · Lei 13.709/2018 (LGPD)',
        { align: 'center' },
      )
      .moveDown(0.5);

    divider(doc);

    // ── 1. QUALIFICAÇÃO DAS PARTES ──────────────────────────────────────────────
    section(doc, '1. QUALIFICAÇÃO DAS PARTES', PRI);

    subsection(doc, 'CONTRATANTE', GRY);
    body(doc, `Razão Social: ${data.agency_razao_social}`);
    body(doc, `CNPJ: ${formatCnpj(data.agency_cnpj)}`);
    body(doc, `Endereço: ${data.agency_address} — ${data.agency_city_state}`);
    body(doc, `Representante Legal: ${data.agency_representative} — CPF: ${formatCpf(data.agency_cpf)}`);
    doc.moveDown(0.5);

    subsection(doc, 'CONTRATADA (FORNECEDOR PJ)', GRY);
    body(doc, `Razão Social: ${data.razao_social}${data.nome_fantasia ? ` (${data.nome_fantasia})` : ''}`);
    body(doc, `CNPJ: ${formatCnpj(data.cnpj)}`);
    const addr = [
      data.address_street, data.address_number, data.address_complement,
      data.address_district, `${data.address_city}/${data.address_state}`, `CEP ${data.address_cep}`,
    ].filter(Boolean).join(', ');
    body(doc, `Endereço: ${addr}`);
    body(doc, `Representante: ${data.representante_nome} — CPF: ${formatCpf(data.representante_cpf)}${data.estado_civil ? ` — ${data.estado_civil}` : ''}`);
    if (data.pix_key) {
      body(doc, `Recebimento principal: ${pixKeyTypeLabel(data.pix_key_type)} — ${data.pix_key}`);
    }
    if (data.bank_name || data.bank_agency || data.bank_account) {
      const bankParts = [
        data.bank_name ? `Banco ${data.bank_name}` : null,
        data.bank_agency ? `Agência ${data.bank_agency}` : null,
        data.bank_account ? `Conta ${data.bank_account}` : null,
      ].filter(Boolean).join(' · ');
      body(doc, `Dados bancários informados: ${bankParts}`);
    }
    doc.moveDown(1);

    // ── 2. NATUREZA JURÍDICA DA RELAÇÃO ────────────────────────────────────────
    section(doc, '2. NATUREZA JURÍDICA DA RELAÇÃO', PRI);
    body(doc,
      '2.1. A presente relação é de natureza estritamente civil e comercial, regida pelo Código Civil ' +
      '(Lei 10.406/2002) e pelo art. 442-B da Consolidação das Leis do Trabalho (CLT), introduzido pela ' +
      'Lei 13.467/2017 (Reforma Trabalhista). NÃO EXISTE, sob qualquer hipótese, relação de emprego, ' +
      'vínculo empregatício, subordinação jurídica, pessoalidade obrigatória, habitualidade ou qualquer ' +
      'outro elemento caracterizador de relação de trabalho regida pela CLT entre as partes.');
    doc.moveDown(0.5);
    body(doc,
      '2.2. A CONTRATADA declara, de forma livre, espontânea e sem qualquer coação, que ACEITA ' +
      'voluntariamente os termos deste contrato, ciente de que: (i) não existe obrigação mínima de ' +
      'oferta de escopos pela CONTRATANTE; (ii) a CONTRATADA pode recusar qualquer escopo sem ' +
      'penalidade, salvo aqueles cujo Aceite de Escopo já tenha sido formalizado; (iii) a CONTRATANTE ' +
      'pode contratar outros fornecedores para os mesmos tipos de serviço sem restrição.');
    doc.moveDown(0.5);
    body(doc,
      '2.3. MULTICLIENTE: A CONTRATADA declara que presta ou poderá prestar serviços simultaneamente ' +
      'para outros contratantes, ressalvada cláusula de confidencialidade específica. A pluralidade de ' +
      'clientes não configura, em nenhuma hipótese, exclusividade ou vínculo trabalhista.');
    doc.moveDown(0.3);
    body(doc,
      '2.3.1. RESTRIÇÃO DE CONCORRÊNCIA EM ESCOPO ESPECÍFICO: Poderão ser acordadas, em Aceites de ' +
      'Escopo determinados, restrições temporárias específicas quanto ao atendimento de clientes ' +
      'concorrentes diretos da CONTRATANTE ou de seus Clientes Finais, mediante remuneração compatível ' +
      'e prazo definido. Tais restrições, quando aplicáveis, prevalecerão sobre a regra geral de ' +
      'multicliente exclusivamente para o escopo e período especificados.');
    doc.moveDown(0.5);
    body(doc,
      '2.4. MEIOS DE PRODUÇÃO PRÓPRIOS: A CONTRATADA declara que possui e utiliza equipamentos, ' +
      'softwares, infraestrutura e demais meios de produção próprios para a execução dos serviços, ' +
      'não sendo providos pela CONTRATANTE. Eventual acesso a sistemas da CONTRATANTE destina-se ' +
      'exclusivamente à gestão dos escopos contratados, sem configurar controle de jornada ou ' +
      'subordinação tecnológica.');
    doc.moveDown(1);

    // ── 3. OBJETO, ACEITE DE ESCOPO E REGISTROS ────────────────────────────────
    section(doc, '3. OBJETO, ACEITE DE ESCOPO E REGISTROS', PRI);
    body(doc,
      '3.1. O objeto deste contrato é a prestação de serviços criativos e/ou estratégicos pela ' +
      'CONTRATADA à CONTRATANTE, compreendendo as entregas especificadas em Aceites de Escopo ' +
      'formalizados durante a vigência deste instrumento.');
    doc.moveDown(0.5);
    body(doc,
      '3.2. ACEITE DE ESCOPO: Documento vinculante emitido pela CONTRATANTE e aceito pela ' +
      'CONTRATADA para cada demanda específica, contendo obrigatoriamente: (a) descrição detalhada ' +
      'da entrega; (b) prazo de conclusão (SLA); (c) valor dos honorários; (d) especificações técnicas ' +
      'e referências; (e) número de rodadas de revisão incluídas; (f) eventual restrição de ' +
      'concorrência, quando aplicável. O Aceite de Escopo integra e complementa este contrato, ' +
      'prevalecendo sobre ele em caso de conflito pontual.');
    doc.moveDown(0.3);
    body(doc,
      '3.2.1. REVISÕES ADICIONAIS: Revisões adicionais às previstas no Aceite de Escopo poderão ' +
      'ser orçadas e contratadas mediante novo Aceite de Escopo ou aditivo ao escopo original, ' +
      'com valor e prazo específicos.');
    doc.moveDown(0.5);
    body(doc,
      '3.3. REGISTROS DA PLATAFORMA: A plataforma registra, para fins exclusivos de gestão de SLA, ' +
      'os timestamps de: (i) envio do Aceite de Escopo; (ii) aceite ou recusa pela CONTRATADA; ' +
      '(iii) envio da entrega; (iv) aprovação ou solicitação de revisão pela CONTRATANTE. Esses ' +
      'registros não configuram controle de jornada, monitoramento de dispositivo, localização ' +
      'geográfica ou qualquer dado de natureza trabalhista.');
    doc.moveDown(1);

    // ── 4. REMUNERAÇÃO, HONORÁRIOS E GLOSA ─────────────────────────────────────
    section(doc, '4. REMUNERAÇÃO, HONORÁRIOS E GLOSA', PRI);
    body(doc,
      '4.1. Os honorários são calculados por escopo entregue e aprovado, conforme valores ' +
      'estabelecidos no respectivo Aceite de Escopo.');
    doc.moveDown(0.5);
    body(doc,
      '4.2. O pagamento será efetuado exclusivamente para a Pessoa Jurídica da CONTRATADA ' +
      '(CNPJ), via PIX ou transferência bancária para conta de titularidade do CNPJ da CONTRATADA, ' +
      'até o dia 10 do mês subsequente à aprovação da entrega ou, havendo contestação de Glosa, ' +
      'até 10 dias após a conclusão da mediação ou solução amigável da controvérsia, condicionado ' +
      'à emissão de Nota Fiscal de Serviços (NFS-e) correspondente. É vedado o pagamento a CPF.');
    doc.moveDown(0.5);
    if (data.pix_key || data.bank_name || data.bank_agency || data.bank_account) {
      const paymentLines = [
        data.pix_key ? `PIX cadastrado: ${pixKeyTypeLabel(data.pix_key_type)} — ${data.pix_key}` : null,
        data.bank_name ? `Banco: ${data.bank_name}` : null,
        data.bank_agency ? `Agência: ${data.bank_agency}` : null,
        data.bank_account ? `Conta: ${data.bank_account}` : null,
      ].filter(Boolean);
      body(doc, `4.2.1. Dados de recebimento informados pela CONTRATADA: ${paymentLines.join(' · ')}.`);
      doc.moveDown(0.5);
    }
    body(doc,
      '4.3. GLOSA POR DESCUMPRIMENTO DE SLA: Em caso de atraso na entrega após formalização ' +
      'do Aceite de Escopo, será aplicada Glosa (desconto) sobre o valor do escopo, conforme a ' +
      'tabela abaixo, que constitui cláusula penal proporcional nos termos do art. 413 do Código Civil:');
    doc.moveDown(0.3);
    glosaTable(doc, GRY);
    doc.moveDown(0.5);
    body(doc,
      '4.4. A Glosa será informada à CONTRATADA antes da emissão da NFS-e. Havendo recusa da ' +
      'CONTRATADA, a questão será submetida a mediação conforme cláusula 11. O prazo de pagamento ' +
      'ficará suspenso até a conclusão da mediação ou solução amigável.');
    doc.moveDown(1);

    // ── 5. PROPRIEDADE INTELECTUAL ──────────────────────────────────────────────
    section(doc, '5. PROPRIEDADE INTELECTUAL E CESSÃO DE DIREITOS', PRI);
    body(doc,
      '5.1. Todos os trabalhos, criações, obras, conceitos, textos, artes, roteiros, estratégias e ' +
      'demais materiais produzidos pela CONTRATADA no âmbito deste contrato ("Obras") são ' +
      'considerados encomendados nos termos do art. 4º e art. 11 da Lei 9.610/1998 (Lei de Direitos ' +
      'Autorais) e, mediante o pagamento dos honorários, são cedidos em caráter exclusivo, definitivo, ' +
      'irrevogável e irretratável à CONTRATANTE, que poderá explorá-los, adaptá-los, sublicenciá-los ' +
      'e transferi-los a seus clientes sem qualquer restrição ou pagamento adicional.');
    doc.moveDown(0.5);
    body(doc,
      '5.2. A cessão abrange todos os direitos patrimoniais previstos na Lei 9.610/1998, incluindo ' +
      'direitos de reprodução, distribuição, comunicação ao público, modificação e criação de obras ' +
      'derivadas, em qualquer território e meio de exploração, presentes e futuros.');
    doc.moveDown(0.5);
    body(doc,
      '5.3. A CONTRATADA mantém o direito moral de autor (art. 27, Lei 9.610/1998), mas concorda ' +
      'que, salvo acordo expresso em contrário, as Obras poderão ser publicadas sem atribuição ' +
      'nominal à CONTRATADA, a critério da CONTRATANTE e/ou de seus clientes.');
    doc.moveDown(0.5);
    body(doc,
      '5.4. GARANTIA DE ORIGINALIDADE E CADEIA DE DIREITOS: A CONTRATADA declara e garante que: ' +
      '(i) as Obras são originais ou que possui todas as autorizações, licenças e cessões necessárias ' +
      'de terceiros, incluindo colaboradores, parceiros, fornecedores de imagens, fontes, músicas ou ' +
      'qualquer outro elemento de autoria de terceiros; (ii) as Obras não violam direitos autorais, ' +
      'marcários, de personalidade ou quaisquer outros direitos de propriedade intelectual de ' +
      'terceiros; (iii) responsabiliza-se integralmente, inclusive perante a CONTRATANTE e seus ' +
      'Clientes Finais, por quaisquer reclamações, demandas judiciais ou extrajudiciais, indenizações ' +
      'ou custos decorrentes de violação de direitos de terceiros, obrigando-se a defender, indenizar ' +
      'e manter a CONTRATANTE indene.');
    doc.moveDown(0.5);
    body(doc,
      '5.5. USO DE INTELIGÊNCIA ARTIFICIAL GENERATIVA: Caso a CONTRATADA utilize ferramentas de ' +
      'Inteligência Artificial generativa (IA) na produção das Obras, declara e se obriga a: ' +
      '(i) utilizar apenas ferramentas que permitam uso comercial das saídas geradas; ' +
      '(ii) não submeter a ferramentas públicas de IA quaisquer dados confidenciais, estratégicos ' +
      'ou sigilosos da CONTRATANTE ou de seus Clientes Finais; ' +
      '(iii) revisar, validar e assumir integral responsabilidade pelas Obras geradas com auxílio ' +
      'de IA, incluindo riscos de violação de direitos de terceiros, plágio ou qualquer outro vício; ' +
      '(iv) informar previamente à CONTRATANTE, quando solicitado, quais ferramentas de IA foram ' +
      'utilizadas em determinado escopo. A CONTRATANTE poderá, a seu exclusivo critério, vedar ou ' +
      'restringir o uso de IA em Aceites de Escopo específicos.');
    doc.moveDown(1);

    // ── 6. CONFIDENCIALIDADE E NDA ─────────────────────────────────────────────
    section(doc, '6. CONFIDENCIALIDADE E NDA', PRI);
    body(doc,
      '6.1. A CONTRATADA se obriga a manter absoluto sigilo sobre todas as informações confidenciais ' +
      'às quais tiver acesso em decorrência deste contrato, incluindo, mas não se limitando a: ' +
      'dados de clientes da CONTRATANTE; estratégias de marketing e comunicação; métricas de ' +
      'performance de campanhas; dados financeiros; briefings e planos de negócio; tecnologias, ' +
      'sistemas e metodologias proprietárias; quaisquer informações não públicas relativas aos ' +
      'Clientes Finais da CONTRATANTE.');
    doc.moveDown(0.5);
    body(doc,
      '6.2. A obrigação de confidencialidade vigorará durante toda a vigência deste contrato e ' +
      'pelo prazo de 5 (cinco) anos após sua rescisão, independentemente do motivo.');
    doc.moveDown(0.5);
    body(doc,
      '6.3. O descumprimento da cláusula de confidencialidade sujeitará a CONTRATADA ao pagamento ' +
      'de indenização por perdas e danos, sem prejuízo de medidas cautelares e inibitórias.');
    doc.moveDown(1);

    // ── 7. CRITÉRIO DE PRIORIZAÇÃO COMERCIAL ──────────────────────────────────
    section(doc, '7. CRITÉRIO DE PRIORIZAÇÃO COMERCIAL', PRI);
    body(doc,
      '7.1. A plataforma mantém um Índice de Priorização Comercial (IPC, escala 0–100) baseado ' +
      'no histórico de cumprimento de SLAs da CONTRATADA. O IPC é um critério comercial e operacional ' +
      'da CONTRATANTE para alocação de escopos, não configurando punição disciplinar, controle de ' +
      'produção ou qualquer elemento de subordinação jurídica.');
    doc.moveDown(0.5);
    body(doc,
      '7.2. Os intervalos de priorização são: (a) IPC ≥ 90: prioridade máxima nas ofertas de escopo; ' +
      '(b) IPC 75–89: alta preferência; (c) IPC 60–74: prioridade padrão; (d) IPC < 60: menor volume ' +
      'de ofertas de escopo, sem qualquer suspensão ou penalidade financeira direta.');
    doc.moveDown(0.5);
    body(doc,
      '7.3. A CONTRATADA poderá consultar seu IPC a qualquer momento pela plataforma e contestar ' +
      'seu cálculo via canal de suporte, que responderá em até 5 dias úteis.');
    doc.moveDown(1);

    // ── 8. RESPONSABILIDADE E ISENÇÃO DE TERCEIROS ────────────────────────────
    section(doc, '8. RESPONSABILIDADE, ISENÇÃO DE TERCEIROS E AUTONOMIA', PRI);
    body(doc,
      '8.1. RESPONSABILIDADE EXCLUSIVA DA CONTRATANTE: A CONTRATANTE é a única responsável ' +
      'pelo cumprimento das obrigações pecuniárias e contratuais previstas neste instrumento. ' +
      'Os clientes da CONTRATANTE (pessoas físicas ou jurídicas que contratam os serviços da ' +
      'agência, doravante "Clientes Finais") NÃO são partes deste contrato e NÃO possuem, em ' +
      'nenhuma hipótese, qualquer obrigação trabalhista, previdenciária, civil ou comercial ' +
      'perante a CONTRATADA.');
    doc.moveDown(0.5);
    body(doc,
      '8.2. ISENÇÃO SOLIDÁRIA: Os Clientes Finais da CONTRATANTE estão expressamente isentos ' +
      'de qualquer responsabilidade solidária ou subsidiária em relação à CONTRATADA, incluindo ' +
      'reclamações trabalhistas, rescisórias, de natureza previdenciária ou indenizatórias de ' +
      'qualquer espécie. A CONTRATADA reconhece que seu único credor contratual é a CONTRATANTE.');
    doc.moveDown(0.5);
    body(doc,
      '8.3. AUTONOMIA OPERACIONAL: A CONTRATADA executa os serviços com plena autonomia ' +
      'operacional e técnica, sem supervisão direta, sem cumprimento de horário determinado e ' +
      'sem sujeição ao poder disciplinar de qualquer das partes envolvidas no processo criativo, ' +
      'inclusive dos Clientes Finais da CONTRATANTE.');
    doc.moveDown(0.5);
    body(doc,
      '8.4. A CONTRATADA assume responsabilidade exclusiva pelo recolhimento de todos os ' +
      'tributos incidentes sobre sua atividade (ISS, IRPJ, CSLL, contribuições previdenciárias ' +
      'e demais encargos), isentando a CONTRATANTE e seus Clientes Finais de qualquer ' +
      'responsabilidade fiscal decorrente da atividade da CONTRATADA.');
    doc.moveDown(1);

    // ── 9. DADOS E PRIVACIDADE ─────────────────────────────────────────────────
    section(doc, '9. DADOS E PRIVACIDADE (LGPD)', PRI);
    body(doc,
      '9.1. Os dados cadastrais da CONTRATADA são utilizados exclusivamente para fins de ' +
      'gestão contratual, faturamento e cumprimento de obrigações legais, nos termos da ' +
      'Lei 13.709/2018 (LGPD).');
    doc.moveDown(0.5);
    body(doc,
      '9.2. A plataforma NÃO coleta localização geográfica em tempo real, biometria, ' +
      'monitoramento de dispositivo, conteúdo de comunicações privadas ou qualquer dado ' +
      'que configure controle de jornada ou vigilância laboral.');
    doc.moveDown(1);

    // ── 10. VIGÊNCIA E RESCISÃO ────────────────────────────────────────────────
    section(doc, '10. VIGÊNCIA E RESCISÃO', PRI);
    body(doc,
      '10.1. Este contrato entra em vigor na data de sua assinatura digital e tem vigência ' +
      'de 12 (doze) meses.');
    doc.moveDown(0.5);
    body(doc,
      '10.2. RENOVAÇÃO EXPRESSA: A renovação ao término do prazo NÃO ocorre automaticamente. ' +
      'Qualquer das partes que desejar renovar deverá manifestar seu interesse por escrito com ' +
      'antecedência mínima de 30 (trinta) dias da data de vencimento. Na ausência de manifestação ' +
      'de ambas as partes, o contrato é considerado encerrado na data de vencimento, sem ônus ' +
      'para nenhuma das partes, desde que não haja Aceite de Escopo em aberto.');
    doc.moveDown(0.5);
    body(doc,
      '10.3. RESCISÃO ANTECIPADA: Qualquer das partes pode rescindir este contrato com aviso ' +
      'prévio escrito de 30 dias, sem ônus, desde que não haja Aceite de Escopo em aberto. ' +
      'Havendo escopos em aberto, a rescisão produz efeitos somente após a conclusão ou distrato ' +
      'específico dos escopos vigentes.');
    doc.moveDown(0.5);
    body(doc,
      '10.4. RESCISÃO IMEDIATA POR JUSTA CAUSA: Qualquer parte poderá rescindir este contrato ' +
      'imediatamente, sem aviso prévio e sem ônus, nos casos de: (a) violação da cláusula de ' +
      'confidencialidade; (b) comprovada má-fé ou fraude; (c) prática de atos que causem danos ' +
      'à reputação da outra parte ou de seus Clientes Finais; (d) violação de direitos de ' +
      'propriedade intelectual de terceiros nas Obras entregues.');
    doc.moveDown(1);

    // ── 11. SOLUÇÃO DE CONTROVÉRSIAS ──────────────────────────────────────────
    section(doc, '11. SOLUÇÃO DE CONTROVÉRSIAS', PRI);
    body(doc,
      '11.1. As partes comprometem-se a buscar solução amigável de eventuais controvérsias, com ' +
      'prazo de 15 (quinze) dias a partir da notificação formal. Frustrada a negociação direta, ' +
      'as partes submeterão a controvérsia à mediação perante câmara arbitral ou de mediação de ' +
      'comum acordo, antes de qualquer medida judicial.');
    doc.moveDown(0.5);
    body(doc,
      '11.2. FORO: Fica eleito o foro da Comarca de ' + foroCidade +
      ' para dirimir quaisquer controvérsias não resolvidas por mediação, com expressa renúncia ' +
      'a qualquer outro, por mais privilegiado que seja.');
    doc.moveDown(1);

    // ── 12. DISPOSIÇÕES GERAIS ─────────────────────────────────────────────────
    section(doc, '12. DISPOSIÇÕES GERAIS', PRI);
    body(doc,
      '12.1. Este contrato representa o acordo integral entre as partes sobre seu objeto, ' +
      'substituindo todas as tratativas, propostas e acordos anteriores, escritos ou verbais.');
    doc.moveDown(0.5);
    body(doc,
      '12.2. Qualquer alteração a este contrato deverá ser feita por escrito e assinada por ' +
      'representantes legais de ambas as partes.');
    doc.moveDown(0.5);
    body(doc,
      '12.3. A eventual invalidade de qualquer cláusula não afeta a validade das demais, ' +
      'que permanecerão vigentes em sua integralidade.');
    doc.moveDown(0.5);
    body(doc,
      '12.4. As partes declaram que leram, compreenderam e concordam integralmente com os ' +
      'termos deste contrato, tendo tido a oportunidade de consultar assessoria jurídica antes ' +
      'da assinatura.');
    doc.moveDown(2);

    // ── Assinaturas ────────────────────────────────────────────────────────────
    divider(doc);
    doc
      .fontSize(10).fillColor(LGT)
      .text(`${foroCidade}, ${data.contract_date}`, { align: 'center' })
      .moveDown(2);

    const pageWidth = 535 - 60;
    const colW = pageWidth / 2 - 20;
    const leftX = 60;
    const rightX = 60 + colW + 40;
    const sigY = doc.y;

    doc.moveTo(leftX, sigY + 40).lineTo(leftX + colW, sigY + 40).strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(PRI).font('Helvetica-Bold')
      .text('CONTRATANTE', leftX, sigY + 44, { width: colW, align: 'center' });
    doc.fontSize(8).fillColor(GRY).font('Helvetica')
      .text(data.agency_razao_social, leftX, sigY + 56, { width: colW, align: 'center' })
      .text(`CNPJ: ${formatCnpj(data.agency_cnpj)}`, leftX, doc.y, { width: colW, align: 'center' })
      .text(`Rep.: ${data.agency_representative}`, leftX, doc.y, { width: colW, align: 'center' });

    doc.moveTo(rightX, sigY + 40).lineTo(rightX + colW, sigY + 40).strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(PRI).font('Helvetica-Bold')
      .text('CONTRATADA (FORNECEDOR PJ)', rightX, sigY + 44, { width: colW, align: 'center' });
    doc.fontSize(8).fillColor(GRY).font('Helvetica')
      .text(data.razao_social, rightX, sigY + 56, { width: colW, align: 'center' })
      .text(`CNPJ: ${formatCnpj(data.cnpj)}`, rightX, doc.y, { width: colW, align: 'center' })
      .text(`Rep.: ${data.representante_nome}`, rightX, doc.y, { width: colW, align: 'center' });

    doc.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function divider(doc: PDFKit.PDFDocument) {
  doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke().moveDown(1);
}

function section(doc: PDFKit.PDFDocument, title: string, color: string) {
  doc.fontSize(11).fillColor(color).font('Helvetica-Bold').text(title).moveDown(0.4);
}

function subsection(doc: PDFKit.PDFDocument, title: string, color: string) {
  doc.fontSize(9).fillColor(color).font('Helvetica-Bold').text(title).moveDown(0.3);
}

function body(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(9).fillColor('#333333').font('Helvetica').text(text, { lineGap: 2 }).moveDown(0.3);
}

function glosaTable(doc: PDFKit.PDFDocument, headerColor: string) {
  const tableLeft = 70;
  const colWidths = [130, 70, 245];
  const rowHeight = 16;
  const headers = ['Atraso na entrega', 'Glosa', 'Observação'];
  const rows = [
    ['Até 24 horas',       '10% do escopo',  'Atraso leve — comunicação prévia obrigatória'],
    ['24 h até 48 h',      '20% do escopo',  'Atraso moderado'],
    ['Acima de 48 horas',  '50% do escopo',  'Atraso grave'],
    ['Abandono de escopo', '100% do escopo', 'Sem entrega após aceite formalizado'],
  ];

  const startY = doc.y;

  doc.rect(tableLeft, startY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
    .fillAndStroke('#f0f0f0', '#cccccc');
  let cx = tableLeft + 4;
  headers.forEach((h, i) => {
    doc.fontSize(8).fillColor(headerColor).font('Helvetica-Bold')
      .text(h, cx, startY + 4, { width: colWidths[i] - 8, lineBreak: false });
    cx += colWidths[i];
  });

  rows.forEach((row, ri) => {
    const rowY = startY + rowHeight * (ri + 1);
    const bg = ri % 2 === 0 ? '#ffffff' : '#fafafa';
    doc.rect(tableLeft, rowY, colWidths[0] + colWidths[1] + colWidths[2], rowHeight)
      .fillAndStroke(bg, '#cccccc');
    let rx = tableLeft + 4;
    row.forEach((cell, ci) => {
      doc.fontSize(8).fillColor('#333333').font('Helvetica')
        .text(cell, rx, rowY + 4, { width: colWidths[ci] - 8, lineBreak: false });
      rx += colWidths[ci];
    });
  });

  doc.y = startY + rowHeight * (rows.length + 1) + 4;
}
