# Inputs Pendentes para Fechar LGPD Operacional

Documento de trabalho — lista o que ainda precisa ser preenchido/decidido para
finalizar o DPA, o Aviso de Privacidade e o pacote LGPD operacional.

Atualizado em: 2026-03-23

---

## 1. Dados legais da Edro (necessários em TODOS os documentos)

| Campo | Onde usar | Status |
|---|---|---|
| Razão social da Edro | DPA, Aviso, contratos | ✅ `EDRO COMUNICACAO DE MARKETING LTDA` |
| CNPJ da Edro | DPA, Aviso | ✅ `42.728.944/0001-20` |
| Endereço sede | DPA, Aviso | ✅ `Rua Samaritá, 1117, 3º Andar, São Paulo, SP` |
| E-mail geral de contato | Aviso | ✅ `privacidade@edro.digital` (mesmo canal de privacidade) |
| E-mail de privacidade / encarregado | DPA, Aviso | ✅ `privacidade@edro.digital` |
| Nome e cargo do encarregado (DPO) | Aviso | ✅ Sem Encarregado formalmente designado — canal: `privacidade@edro.digital` |
| Cidade para assinaturas | DPA | ✅ `São Paulo` |
| Signatário da Edro no DPA | DPA | ✅ `Leonardo Rotundo — Sócio` |

---

## 2. Escopo de serviços (DPA)

✅ **PREENCHIDO no template** — texto padrão aplicado:

> "Plataforma de gestão de produção de conteúdo digital, incluindo briefings, aprovações, calendários editoriais, campanhas, análise de performance, integrações com canais sociais e comunicação com fornecedores criativos."

Ajustar conforme o contrato específico de cada cliente.

---

## 3. Papel das partes (DPA) — ✅ PREENCHIDO no template

Para a maioria dos clientes Edro:

- `{{CLIENT_ROLE_IN_PROCESSING}}` → **Controlador** — o cliente determina as finalidades e meios do tratamento dos dados de seus próprios consumidores/audiência
- `{{EDRO_ROLE_IN_PROCESSING}}` → **Operadora** — a Edro trata dados pessoais conforme instruções do cliente no contexto da plataforma

Exceção: dados de usuários internos da Edro (colaboradores, freelancers) → Edro como controladora.

---

## 4. Canal de solicitações do titular (Aviso de Privacidade)

✅ **DEFINIDO**: E-mail: privacidade@edro.digital — indicar no assunto 'Direito do Titular'

Templates atualizados com este canal.

---

## 5. Subprocessadores — referência no DPA — ✅ PREENCHIDO no template

Texto aplicado:

> "Lista de subprocessadores disponível em `docs/security/SUBPROCESSOR_REGISTER_SHAREABLE_2026-03-21.md` ou mediante solicitação por e-mail ao canal de privacidade."

---

## 6. Cláusula de notificação de subprocessadores (DPA — opcional) — ✅ PREENCHIDO no template

`{{OPTIONAL_SUBPROCESSOR_NOTICE_CLAUSE}}` — recomendação:

Para clientes enterprise, incluir:
> "A Edro notificará o Cliente com antecedência mínima de 30 (trinta) dias sobre adição de novo subprocessador que acesse dados pessoais cobertos por este Anexo, disponibilizando oportunidade de objeção razoável."

Para clientes padrão: remover a cláusula ou substituir por texto mais genérico.

---

## 7. Regra de retorno/descarte ao término (DPA) — ✅ PREENCHIDO no template

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

1. ✅ Todos os campos da Edro preenchidos (dados legais, canal de privacidade, signatário)
2. ✅ Canal do titular definido: privacidade@edro.digital
3. ✅ Caixa de e-mail `privacidade@edro.digital` criada (2026-03-23)
4. Enviar DPA e Aviso para revisão jurídica com estas notas
5. Após aprovação jurídica: publicar Aviso de Privacidade na plataforma
6. Incluir DPA como anexo padrão nos contratos de clientes enterprise

---

## 10. Referências

- Template DPA: `docs/security/templates/DPA_TEMPLATE.md`
- Template Aviso: `docs/security/templates/PRIVACY_NOTICE_TEMPLATE.md`
- ROPA preliminar: `docs/security/ROPA_PRELIMINARY_2026-03-21.md`
- Subprocessadores: `docs/security/SUBPROCESSOR_REGISTER_SHAREABLE_2026-03-21.md`
- Checklist readiness DPA: `docs/security/DPA_READINESS_CHECKLIST.md`
- Checklist gap aviso: `docs/security/PRIVACY_NOTICE_GAP_CHECKLIST.md`
