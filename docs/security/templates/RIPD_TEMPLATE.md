# RIPD - Relatorio de Impacto a Protecao de Dados Pessoais

## Identificacao

- Nome do fluxo / processamento:
  {{FLOW_NAME}}
- Referencia ROPA:
  {{ROPA_FLOW_ID}}
- Data de elaboracao:
  {{DATE}}
- Owner do processo:
  {{PROCESS_OWNER}}
- Owner tecnico:
  {{TECH_OWNER}}
- Revisor juridico:
  {{LEGAL_REVIEWER}}
- Status:
  {{STATUS}} (rascunho / em revisao / aprovado)

---

## 1. Descricao sistematica do tratamento

### 1.1 Natureza do tratamento

Descreva o que e feito com os dados pessoais (coleta, armazenamento, processamento, transmissao, enriquecimento, exclusao, etc.).

{{NATURE_OF_PROCESSING}}

### 1.2 Finalidade e base legal

| Finalidade | Base legal (LGPD art. 7 / art. 11) | Justificativa |
| --- | --- | --- |
| {{PURPOSE_1}} | {{LEGAL_BASIS_1}} | {{JUSTIFICATION_1}} |

### 1.3 Dados pessoais envolvidos

| Categoria | Exemplos | Volume estimado | Sensivel? |
| --- | --- | --- | --- |
| {{CATEGORY_1}} | {{EXAMPLES_1}} | {{VOLUME_1}} | {{SENSITIVE_1}} |

### 1.4 Titulares

- Perfil dos titulares: {{DATA_SUBJECTS_PROFILE}}
- Relacao de poder (titular em posicao vulneravel?): {{POWER_RELATION}}
- Expectativa razoavel de tratamento: {{REASONABLE_EXPECTATION}}

### 1.5 Fluxo de dados

| Etapa | Sistema | Dado envolvido | Subprocessador? |
| --- | --- | --- | --- |
| {{STEP_1}} | {{SYSTEM_1}} | {{DATA_1}} | {{SUBPROC_1}} |

### 1.6 Retencao e descarte

- Prazo de retencao: {{RETENTION_PERIOD}}
- Evento que inicia a contagem: {{RETENTION_START}}
- Metodo de descarte: {{DISPOSAL_METHOD}}

---

## 2. Necessidade e proporcionalidade

### 2.1 A finalidade e legitima?

{{LEGITIMATE_PURPOSE_ASSESSMENT}}

### 2.2 Os dados sao minimos para a finalidade?

Dado a dado:

| Dado | Necessario? | Alternativa menos invasiva? |
| --- | --- | --- |
| {{DATA_ITEM_1}} | {{NECESSARY_1}} | {{ALTERNATIVE_1}} |

### 2.3 Ha transferencia internacional?

- Paises de destino: {{INTL_TRANSFER_COUNTRIES}}
- Mecanismo de adequacao: {{ADEQUACY_MECHANISM}}
- DPA assinado com subprocessadores internacionais: {{DPA_SIGNED}}

---

## 3. Avaliacao de riscos

Para cada risco, atribuir probabilidade (A/M/B) e impacto (A/M/B) e calcular nivel (AA/AM/AB/MA/MM/MB/BA/BM/BB).

| Risco | Descricao | Probabilidade | Impacto | Nivel | Controle existente |
| --- | --- | --- | --- | --- | --- |
| Acesso indevido | {{RISK_UNAUTH_DESC}} | {{RISK_UNAUTH_P}} | {{RISK_UNAUTH_I}} | {{RISK_UNAUTH_LEVEL}} | {{RISK_UNAUTH_CTRL}} |
| Vazamento externo | {{RISK_LEAK_DESC}} | {{RISK_LEAK_P}} | {{RISK_LEAK_I}} | {{RISK_LEAK_LEVEL}} | {{RISK_LEAK_CTRL}} |
| Uso indevido (desvio de finalidade) | {{RISK_MISUSE_DESC}} | {{RISK_MISUSE_P}} | {{RISK_MISUSE_I}} | {{RISK_MISUSE_LEVEL}} | {{RISK_MISUSE_CTRL}} |
| Retencao excessiva | {{RISK_RETENTION_DESC}} | {{RISK_RETENTION_P}} | {{RISK_RETENTION_I}} | {{RISK_RETENTION_LEVEL}} | {{RISK_RETENTION_CTRL}} |
| Risco especifico do fluxo | {{RISK_SPECIFIC_DESC}} | {{RISK_SPECIFIC_P}} | {{RISK_SPECIFIC_I}} | {{RISK_SPECIFIC_LEVEL}} | {{RISK_SPECIFIC_CTRL}} |

### Risco residual geral

- Nivel: {{RESIDUAL_RISK_LEVEL}}
- Justificativa: {{RESIDUAL_RISK_JUSTIFICATION}}

---

## 4. Medidas para mitigar os riscos

| Medida | Risco mitigado | Owner | Prazo | Status |
| --- | --- | --- | --- | --- |
| {{MEASURE_1}} | {{MITIGATES_1}} | {{OWNER_1}} | {{DEADLINE_1}} | {{STATUS_1}} |

---

## 5. Consultores e stakeholders consultados

| Papel | Nome | Data |
| --- | --- | --- |
| Juridico/privacidade | {{LEGAL_NAME}} | {{LEGAL_DATE}} |
| Tecnico | {{TECH_NAME}} | {{TECH_DATE}} |
| Operacoes | {{OPS_NAME}} | {{OPS_DATE}} |

---

## 6. Conclusao

### O tratamento pode prosseguir?

- [ ] Sim, sem restricoes
- [ ] Sim, com as medidas listadas na secao 4 implementadas
- [ ] Nao — riscos nao mitigaveis identificados, necessario revisao de finalidade ou descontinuacao

### Justificativa

{{CONCLUSION_JUSTIFICATION}}

### Consulta a ANPD necessaria?

- [ ] Nao — riscos residuais baixos ou medios com controles adequados
- [ ] Sim — alto risco residual ou dado sensivel sem base legal robusta

---

## 7. Revisao e historico

| Data | Versao | Alteracao | Autor |
| --- | --- | --- | --- |
| {{DATE}} | 1.0 | Versao inicial | {{AUTHOR}} |
