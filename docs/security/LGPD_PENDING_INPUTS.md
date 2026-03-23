# Inputs Pendentes para Fechar LGPD Operacional

Documento de trabalho — lista o que ainda precisa ser preenchido/decidido para
finalizar o DPA, o Aviso de Privacidade e o pacote LGPD operacional.

Atualizado em: 2026-03-23

---

## 1. Dados legais da Edro (necessários em TODOS os documentos)

| Campo | Onde usar | Status |
|---|---|---|
| Razão social da Edro | DPA, Aviso, contratos | **PENDENTE — preencher** |
| CNPJ da Edro | DPA, Aviso | **PENDENTE — preencher** |
| Endereço sede | DPA, Aviso | **PENDENTE — preencher** |
| E-mail geral de contato | Aviso | **PENDENTE — definir** |
| E-mail de privacidade / encarregado | DPA, Aviso | **PENDENTE — definir** |
| Nome e cargo do encarregado (DPO) | Aviso | **PENDENTE — designar ou indicar que não há DPO nomeado formalmente** |
| Cidade para assinaturas | DPA | Sugestão: `São Paulo` — confirmar |
| Signatário da Edro no DPA | DPA | **PENDENTE** |

---

## 2. Escopo de serviços (DPA)

Substituir `{{SERVICE_SCOPE}}` por:

> "Plataforma de gestão de produção de conteúdo digital, incluindo briefings, aprovações, calendários editoriais, campanhas, análise de performance, integrações com canais sociais e comunicação com fornecedores criativos."

Ajustar conforme o contrato específico de cada cliente.

---

## 3. Papel das partes (DPA)

Para a maioria dos clientes Edro:

- `{{CLIENT_ROLE_IN_PROCESSING}}` → **Controlador** — o cliente determina as finalidades e meios do tratamento dos dados de seus próprios consumidores/audiência
- `{{EDRO_ROLE_IN_PROCESSING}}` → **Operadora** — a Edro trata dados pessoais conforme instruções do cliente no contexto da plataforma

Exceção: dados de usuários internos da Edro (colaboradores, freelancers) → Edro como controladora.

---

## 4. Canal de solicitações do titular (Aviso de Privacidade)

Substituir `{{DATA_SUBJECT_REQUEST_CHANNEL}}` por um dos formatos abaixo:

**Opção A** (e-mail direto):
> "E-mail: privacidade@edro.digital — indicar no assunto 'Direito do Titular'"

**Opção B** (formulário):
> "Formulário disponível em: [URL do formulário]"

**Decisão pendente**: definir o canal e criar o endereço de e-mail ou formulário.

---

## 5. Subprocessadores — referência no DPA

Substituir `{{SUBPROCESSOR_REFERENCE}}` por:

> "Lista de subprocessadores disponível em `docs/security/SUBPROCESSOR_REGISTER_SHAREABLE_2026-03-21.md` ou mediante solicitação por e-mail ao canal de privacidade."

---

## 6. Cláusula de notificação de subprocessadores (DPA — opcional)

`{{OPTIONAL_SUBPROCESSOR_NOTICE_CLAUSE}}` — recomendação:

Para clientes enterprise, incluir:
> "A Edro notificará o Cliente com antecedência mínima de 30 (trinta) dias sobre adição de novo subprocessador que acesse dados pessoais cobertos por este Anexo, disponibilizando oportunidade de objeção razoável."

Para clientes padrão: remover a cláusula ou substituir por texto mais genérico.

---

## 7. Regra de retorno/descarte ao término (DPA)

Substituir `{{TERMINATION_RETURN_DELETE_RULE}}` por:

> "Encerrada a relação contratual, a Edro excluirá ou anonimizará os dados pessoais cobertos por este Anexo em até 90 (noventa) dias, ressalvados dados sujeitos a obrigação legal de retenção, backups operacionais em janela de rotação e registros de auditoria necessários para defesa de direitos."

---

## 8. Seção de cookies (Aviso) — JÁ PREENCHIDA

A seção 10 do template foi preenchida com base na implementação real:
- Cookie `HttpOnly`, `Secure`, `SameSite=Lax`
- Sem cookies de terceiros / rastreamento
- Tecnicamente necessário — não requer consentimento

**Nenhuma ação pendente nesta seção.**

---

## 9. Próximos passos para publicação

1. Preencher os campos da tabela do item 1 (dados legais da Edro)
2. Definir e criar o canal do titular (item 4)
3. Enviar DPA e Aviso para revisão jurídica com estas notas
4. Após aprovação jurídica: publicar Aviso de Privacidade na plataforma
5. Incluir DPA como anexo padrão nos contratos de clientes enterprise

---

## 10. Referências

- Template DPA: `docs/security/templates/DPA_TEMPLATE.md`
- Template Aviso: `docs/security/templates/PRIVACY_NOTICE_TEMPLATE.md`
- ROPA preliminar: `docs/security/ROPA_PRELIMINARY_2026-03-21.md`
- Subprocessadores: `docs/security/SUBPROCESSOR_REGISTER_SHAREABLE_2026-03-21.md`
- Checklist readiness DPA: `docs/security/DPA_READINESS_CHECKLIST.md`
- Checklist gap aviso: `docs/security/PRIVACY_NOTICE_GAP_CHECKLIST.md`
