-- Seed de Dados de Exemplo para o Sistema de Editais
-- Insere editais de exemplo para demonstração

-- Limpar dados existentes (opcional, comentar se não quiser)
-- DELETE FROM edital_usuarios;
-- DELETE FROM edital_questoes;
-- DELETE FROM edital_eventos;
-- DELETE FROM editais;

-- Edital 1: TRF - Analista Judiciário
INSERT INTO editais (
    codigo, titulo, orgao, banca, status,
    data_publicacao, data_inscricao_inicio, data_inscricao_fim, data_prova_prevista,
    descricao, numero_vagas, taxa_inscricao,
    cargos, disciplinas, tags,
    link_edital_completo, link_inscricao
) VALUES (
    'TRF-2025-001',
    'Concurso Público para Analista Judiciário - Área Apoio Especializado',
    'Tribunal Regional Federal da 1ª Região',
    'CESPE/CEBRASPE',
    'em_andamento',
    '2025-01-10',
    '2025-01-15',
    '2025-02-28',
    '2025-04-15',
    'Concurso público para provimento de vagas e formação de cadastro de reserva no cargo de Analista Judiciário nas especialidades de Tecnologia da Informação, Contabilidade e Engenharia Civil.',
    50,
    150.00,
    '[
        {"nome": "Analista Judiciário - TI", "vagas": 25, "salario": 13994.78, "requisitos": "Ensino Superior em Tecnologia da Informação ou áreas afins", "carga_horaria": "40h semanais"},
        {"nome": "Analista Judiciário - Contabilidade", "vagas": 15, "salario": 13994.78, "requisitos": "Ensino Superior em Ciências Contábeis", "carga_horaria": "40h semanais"},
        {"nome": "Analista Judiciário - Engenharia Civil", "vagas": 10, "salario": 13994.78, "requisitos": "Ensino Superior em Engenharia Civil com registro no CREA", "carga_horaria": "40h semanais"}
    ]'::jsonb,
    '[
        {"nome": "Língua Portuguesa", "peso": 1.0, "numero_questoes": 15},
        {"nome": "Noções de Direito Constitucional", "peso": 1.0, "numero_questoes": 10},
        {"nome": "Noções de Direito Administrativo", "peso": 1.0, "numero_questoes": 10},
        {"nome": "Conhecimentos Específicos", "peso": 2.0, "numero_questoes": 35}
    ]'::jsonb,
    '["federal", "judiciario", "nivel-superior", "cespe"]'::jsonb,
    'https://www.cebraspe.org.br/concursos/TRF1_25',
    'https://www.cebraspe.org.br/inscricao'
);

-- Eventos para Edital TRF
INSERT INTO edital_eventos (edital_id, tipo, titulo, descricao, data_inicio, data_fim, concluido)
SELECT 
    id,
    'inscricao',
    'Período de Inscrições',
    'Inscrições exclusivamente pela internet no site da CESPE',
    '2025-01-15 00:00:00',
    '2025-02-28 18:00:00',
    false
FROM editais WHERE codigo = 'TRF-2025-001';

INSERT INTO edital_eventos (edital_id, tipo, titulo, descricao, data_inicio, data_fim, concluido)
SELECT 
    id,
    'prova',
    'Provas Objetivas e Discursivas',
    'Aplicação das provas em todo o território nacional',
    '2025-04-15 08:00:00',
    '2025-04-15 13:00:00',
    false
FROM editais WHERE codigo = 'TRF-2025-001';

-- Edital 2: INSS - Técnico do Seguro Social
INSERT INTO editais (
    codigo, titulo, orgao, banca, status,
    data_publicacao, data_inscricao_inicio, data_inscricao_fim, data_prova_prevista,
    descricao, numero_vagas, taxa_inscricao,
    cargos, disciplinas, tags
) VALUES (
    'INSS-2025-TEC',
    'Concurso Público para Técnico do Seguro Social',
    'Instituto Nacional do Seguro Social - INSS',
    'FCC',
    'publicado',
    '2025-01-20',
    '2025-02-01',
    '2025-03-15',
    '2025-05-10',
    'Concurso público nacional para preenchimento de 1.000 vagas para o cargo de Técnico do Seguro Social, com lotação em todas as unidades da Federação.',
    1000,
    85.00,
    '[
        {"nome": "Técnico do Seguro Social", "vagas": 1000, "salario": 5905.79, "requisitos": "Ensino Médio Completo", "carga_horaria": "40h semanais"}
    ]'::jsonb,
    '[
        {"nome": "Língua Portuguesa", "peso": 1.0, "numero_questoes": 15},
        {"nome": "Raciocínio Lógico-Matemático", "peso": 1.0, "numero_questoes": 10},
        {"nome": "Noções de Informática", "peso": 1.0, "numero_questoes": 10},
        {"nome": "Ética no Serviço Público", "peso": 1.0, "numero_questoes": 10},
        {"nome": "Noções de Direito Constitucional e Administrativo", "peso": 1.0, "numero_questoes": 15},
        {"nome": "Legislação Previdenciária", "peso": 2.0, "numero_questoes": 30}
    ]'::jsonb,
    '["federal", "previdencia", "nivel-medio", "fcc", "alto-volume-vagas"]'::jsonb
);

-- Edital 3: Polícia Federal - Agente
INSERT INTO editais (
    codigo, titulo, orgao, banca, status,
    data_publicacao, data_inscricao_inicio, data_inscricao_fim, data_prova_prevista,
    descricao, numero_vagas, taxa_inscricao,
    cargos, disciplinas, tags
) VALUES (
    'PF-2025-AGENTE',
    'Concurso Público Nacional para Agente de Polícia Federal',
    'Polícia Federal - Ministério da Justiça',
    'CESPE/CEBRASPE',
    'publicado',
    '2025-02-01',
    '2025-02-10',
    '2025-03-20',
    '2025-05-25',
    'Concurso público para provimento de 600 vagas para o cargo de Agente de Polícia Federal, com lotação em todas as unidades da Federação.',
    600,
    200.00,
    '[
        {"nome": "Agente de Polícia Federal", "vagas": 600, "salario": 23692.74, "requisitos": "Diploma de nível superior em qualquer área + CNH categoria B", "carga_horaria": "40h semanais"}
    ]'::jsonb,
    '[
        {"nome": "Língua Portuguesa", "peso": 1.0, "numero_questoes": 15},
        {"nome": "Noções de Informática", "peso": 1.0, "numero_questoes": 10},
        {"nome": "Noções de Direito Constitucional", "peso": 1.5, "numero_questoes": 12},
        {"nome": "Noções de Direito Administrativo", "peso": 1.5, "numero_questoes": 12},
        {"nome": "Noções de Direito Penal", "peso": 2.0, "numero_questoes": 15},
        {"nome": "Noções de Direito Processual Penal", "peso": 2.0, "numero_questoes": 15},
        {"nome": "Legislação Especial", "peso": 1.5, "numero_questoes": 12},
        {"nome": "Contabilidade", "peso": 1.0, "numero_questoes": 9}
    ]'::jsonb,
    '["federal", "policia", "seguranca", "nivel-superior", "cespe", "alto-salario"]'::jsonb
);

-- Edital 4: Prefeitura Municipal - Diversos Cargos
INSERT INTO editais (
    codigo, titulo, orgao, banca, status,
    data_publicacao, data_inscricao_inicio, data_inscricao_fim, data_prova_prevista,
    descricao, numero_vagas, taxa_inscricao,
    cargos, disciplinas, tags
) VALUES (
    'PMSP-2025-001',
    'Concurso Público para Diversos Cargos da Administração Municipal',
    'Prefeitura Municipal de São Paulo',
    'VUNESP',
    'rascunho',
    NULL,
    NULL,
    NULL,
    '2025-06-15',
    'Concurso público municipal para provimento de vagas nas áreas administrativa, saúde, educação e tecnologia.',
    300,
    75.00,
    '[
        {"nome": "Auxiliar Administrativo", "vagas": 100, "salario": 3500.00, "requisitos": "Ensino Médio Completo"},
        {"nome": "Técnico de Enfermagem", "vagas": 80, "salario": 4200.00, "requisitos": "Ensino Médio + Curso Técnico + COREN"},
        {"nome": "Professor de Educação Infantil", "vagas": 70, "salario": 5000.00, "requisitos": "Licenciatura em Pedagogia"},
        {"nome": "Analista de TI", "vagas": 50, "salario": 8000.00, "requisitos": "Ensino Superior em TI ou áreas afins"}
    ]'::jsonb,
    '[
        {"nome": "Língua Portuguesa", "peso": 1.0, "numero_questoes": 20},
        {"nome": "Matemática", "peso": 1.0, "numero_questoes": 15},
        {"nome": "Conhecimentos Gerais", "peso": 0.5, "numero_questoes": 10},
        {"nome": "Conhecimentos Específicos", "peso": 2.0, "numero_questoes": 35}
    ]'::jsonb,
    '["municipal", "sao-paulo", "multiplos-cargos", "vunesp"]'::jsonb
);

-- Edital 5: Banco do Brasil
INSERT INTO editais (
    codigo, titulo, orgao, banca, status,
    data_publicacao, data_inscricao_inicio, data_inscricao_fim, data_prova_prevista,
    descricao, numero_vagas, numero_inscritos, taxa_inscricao,
    cargos, disciplinas, tags,
    observacoes
) VALUES (
    'BB-2025-ESCRITURARIO',
    'Concurso Público Nacional para Escriturário - Agente Comercial',
    'Banco do Brasil S.A.',
    'CESGRANRIO',
    'concluido',
    '2024-10-15',
    '2024-10-20',
    '2024-11-30',
    '2025-01-28',
    'Concurso público de âmbito nacional para provimento de 6.000 vagas para o cargo de Escriturário - Agente Comercial.',
    6000,
    850000,
    110.00,
    '[
        {"nome": "Escriturário - Agente Comercial", "vagas": 6000, "salario": 3622.23, "requisitos": "Ensino Médio Completo", "carga_horaria": "30h semanais"}
    ]'::jsonb,
    '[
        {"nome": "Língua Portuguesa", "peso": 1.0, "numero_questoes": 15},
        {"nome": "Língua Inglesa", "peso": 0.5, "numero_questoes": 5},
        {"nome": "Matemática", "peso": 1.0, "numero_questoes": 15},
        {"nome": "Conhecimentos Bancários", "peso": 1.5, "numero_questoes": 20},
        {"nome": "Noções de Informática", "peso": 1.0, "numero_questoes": 10},
        {"nome": "Atualidades do Mercado Financeiro", "peso": 1.0, "numero_questoes": 10}
    ]'::jsonb,
    '["banco", "setor-privado", "nivel-medio", "cesgranrio", "nacional", "alto-volume-vagas"]'::jsonb,
    'Prova realizada em janeiro de 2025. Resultado final previsto para fevereiro de 2025.'
);

-- Inserir eventos para o edital do Banco do Brasil (já concluído)
INSERT INTO edital_eventos (edital_id, tipo, titulo, descricao, data_inicio, data_fim, concluido)
SELECT 
    id,
    'inscricao',
    'Período de Inscrições',
    'Inscrições exclusivamente pela internet',
    '2024-10-20 10:00:00',
    '2024-11-30 23:59:59',
    true
FROM editais WHERE codigo = 'BB-2025-ESCRITURARIO';

INSERT INTO edital_eventos (edital_id, tipo, titulo, data_inicio, data_fim, concluido)
SELECT 
    id,
    'prova',
    'Aplicação da Prova Objetiva',
    '2025-01-28 10:00:00',
    '2025-01-28 14:30:00',
    true
FROM editais WHERE codigo = 'BB-2025-ESCRITURARIO';

INSERT INTO edital_eventos (edital_id, tipo, titulo, descricao, data_inicio, concluido)
SELECT 
    id,
    'resultado',
    'Divulgação do Resultado Final',
    'Resultado final e convocação dos aprovados',
    '2025-02-28 00:00:00',
    false
FROM editais WHERE codigo = 'BB-2025-ESCRITURARIO';

-- Inserir estatísticas/comentários
COMMENT ON TABLE editais IS 'Sistema de gestão de editais - 5 editais de exemplo inseridos';

-- View para verificar os dados inseridos
DO $$
BEGIN
    RAISE NOTICE '✅ Seed de editais concluído com sucesso!';
    RAISE NOTICE '📊 Total de editais inseridos: %', (SELECT COUNT(*) FROM editais);
    RAISE NOTICE '📅 Total de eventos inseridos: %', (SELECT COUNT(*) FROM edital_eventos);
    RAISE NOTICE '';
    RAISE NOTICE '📋 Editais criados:';
    RAISE NOTICE '   1. TRF - Analista Judiciário (50 vagas)';
    RAISE NOTICE '   2. INSS - Técnico do Seguro Social (1000 vagas)';
    RAISE NOTICE '   3. Polícia Federal - Agente (600 vagas)';
    RAISE NOTICE '   4. Prefeitura SP - Diversos Cargos (300 vagas)';
    RAISE NOTICE '   5. Banco do Brasil - Escriturário (6000 vagas)';
END $$;
