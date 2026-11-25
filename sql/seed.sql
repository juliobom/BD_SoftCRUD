BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM equipe WHERE nome IN ('Gestão', 'Desenvolvimento', 'Suporte', 'Atendimento'))
     OR EXISTS (SELECT 1 FROM colaborador WHERE email LIKE '%@empresa.com') THEN
    RAISE EXCEPTION 'Os dados de exemplo já estão no banco. Rode "npm run db:seed:limpar" antes.';
  END IF;
END $$;

INSERT INTO equipe (nome, descricao, data_criacao, id_equipe_superior) VALUES
  ('Gestão','Coordenação geral das equipes.', '2026-01-05', NULL);

INSERT INTO equipe (nome, descricao, data_criacao, id_equipe_superior) VALUES
  ('Desenvolvimento', 'Equipe responsável pelas entregas das sprints.', '2026-01-05', (SELECT id_equipe FROM equipe WHERE nome = 'Gestão')),
  ('Suporte', 'Coordenação do atendimento e chamados.', '2026-01-05', (SELECT id_equipe FROM equipe WHERE nome = 'Gestão'));

INSERT INTO equipe (nome, descricao, data_criacao, id_equipe_superior) VALUES
  ('Atendimento', 'Equipe de atendimento diário aos chamados.', '2026-01-05', (SELECT id_equipe FROM equipe WHERE nome = 'Suporte'));


INSERT INTO colaborador (nome, email, cargo, data_cadastro, status_conta, id_equipe) VALUES
  ('Carlos Silva',   'carlos.silva@empresa.com',   'Gestor',                  '2026-01-10', 'ativa',   (SELECT id_equipe FROM equipe WHERE nome = 'Gestão')),
  ('Maria Oliveira', 'maria.oliveira@empresa.com', 'Desenvolvedora',          '2026-01-10', 'ativa',   (SELECT id_equipe FROM equipe WHERE nome = 'Desenvolvimento')),
  ('João Santos',    'joao.santos@empresa.com',    'Desenvolvedor',           '2026-01-10', 'ativa',   (SELECT id_equipe FROM equipe WHERE nome = 'Desenvolvimento')),
  ('Pedro Lima',     'pedro.lima@empresa.com',     'Desenvolvedor',           '2026-01-10', 'inativa', (SELECT id_equipe FROM equipe WHERE nome = 'Desenvolvimento')),
  ('Ana Costa',      'ana.costa@empresa.com',      'Gestora de Suporte',      '2026-01-10', 'ativa',   (SELECT id_equipe FROM equipe WHERE nome = 'Suporte')),
  ('Lucas Pereira',  'lucas.pereira@empresa.com',  'Analista de Atendimento', '2026-01-10', 'ativa',   (SELECT id_equipe FROM equipe WHERE nome = 'Atendimento'));


INSERT INTO fato (descricao, data_ocorrencia, data_registro, contexto, fonte_verificacao, id_colaborador) VALUES
  ('Entregou todas as tarefas da Sprint #2 antes do prazo combinado.',
   '2026-11-10', '2026-11-10 17:00', 'Encerramento da Sprint #2', 'Quadro da Sprint #2',
   (SELECT id_colaborador FROM colaborador WHERE email = 'carlos.silva@empresa.com')),

  ('Atrasou em dois dias a entrega do relatório semanal da Sprint #2.',
   '2026-11-14', '2026-11-14 18:00', 'Acompanhamento da Sprint #2', 'E-mail da equipe',
   (SELECT id_colaborador FROM colaborador WHERE email = 'carlos.silva@empresa.com')),

  ('Organizou a lista de tarefas antes da reunião da Sprint #3.',
   '2026-11-18', '2026-11-18 12:00', 'Planejamento da Sprint #3', 'Ata da reunião de 18/11/2026',
   (SELECT id_colaborador FROM colaborador WHERE email = 'maria.oliveira@empresa.com')),

  ('Respondeu todos os chamados abertos durante a Sprint #2 dentro do prazo do dia.',
   '2026-11-17', '2026-11-17 18:30', 'Atendimento da Sprint #2', 'Fila de chamados da semana',
   (SELECT id_colaborador FROM colaborador WHERE email = 'ana.costa@empresa.com'));


WITH novo AS (
  INSERT INTO feedback (data_emissao, descricao, status, visibilidade, id_emissor, id_receptor) VALUES (
    '2026-11-11 10:00',
    'Parabéns pelas entregas da Sprint #2, todas antes do prazo combinado.',
    'confirmado',
    'compartilhado com gestor',
    (SELECT id_colaborador FROM colaborador WHERE email = 'carlos.silva@empresa.com'),
    (SELECT id_colaborador FROM colaborador WHERE email = 'maria.oliveira@empresa.com')
  )
  RETURNING id_feedback
),
positivo AS (
  INSERT INTO feedback_positivo (id_feedback, conquista, descricao_impacto)
  SELECT id_feedback, 'Entregas da Sprint #2 no prazo', 'A Sprint #2 foi encerrada sem tarefas pendentes.' FROM novo
)
INSERT INTO feedback_fato (id_feedback, id_fato)
SELECT novo.id_feedback, fato.id_fato FROM novo, fato WHERE fato.fonte_verificacao = 'Quadro da Sprint #2';


WITH novo AS (
  INSERT INTO feedback (data_emissao, descricao, status, visibilidade, id_emissor, id_receptor) VALUES (
    '2026-11-15 09:30',
    'O atraso do relatório semanal dificultou o acompanhamento da Sprint #2.',
    'enviado',
    'privado',
    (SELECT id_colaborador FROM colaborador WHERE email = 'carlos.silva@empresa.com'),
    (SELECT id_colaborador FROM colaborador WHERE email = 'joao.santos@empresa.com')
  )
  RETURNING id_feedback, id_receptor
),
construtivo AS (
  INSERT INTO feedback_construtivo (id_feedback, area_melhoria, sugestao)
  SELECT id_feedback, 'Pontualidade nas entregas semanais', 'Programar um lembrete para enviar o relatório semanal dentro do prazo.' FROM novo
),
fatos AS (
  INSERT INTO feedback_fato (id_feedback, id_fato)
  SELECT novo.id_feedback, fato.id_fato FROM novo, fato WHERE fato.fonte_verificacao = 'E-mail da equipe'
)
INSERT INTO acao (id_feedback, nr_sequencial, descricao, prazo, status, id_responsavel)
SELECT novo.id_feedback, plano.numero, plano.descricao, plano.prazo::date, plano.status, novo.id_receptor
FROM novo, (VALUES
  (1, 'Criar um lembrete toda quinta-feira para enviar o relatório semanal.', '2026-11-20', 'pendente'),
  (2, 'Atualizar diariamente o andamento das tarefas da Sprint #3 no quadro.', '2026-11-29', 'em andamento'),
  (3, 'Alinhar o modelo padrão do relatório com o gestor.', '2026-11-22', 'concluída')
) AS plano (numero, descricao, prazo, status);


WITH novo AS (
  INSERT INTO feedback (data_emissao, descricao, status, visibilidade, id_emissor, id_receptor) VALUES (
    '2026-11-19 14:00',
    'A lista de tarefas organizada deixou o planejamento da Sprint #3 mais objetivo.',
    'rascunho',
    'privado',
    (SELECT id_colaborador FROM colaborador WHERE email = 'maria.oliveira@empresa.com'),
    (SELECT id_colaborador FROM colaborador WHERE email = 'joao.santos@empresa.com')
  )
  RETURNING id_feedback
),
positivo AS (
  INSERT INTO feedback_positivo (id_feedback, conquista, descricao_impacto)
  SELECT id_feedback, 'Organização do planejamento da Sprint #3', 'A reunião de planejamento terminou antes do tempo previsto.' FROM novo
)
INSERT INTO feedback_fato (id_feedback, id_fato)
SELECT novo.id_feedback, fato.id_fato FROM novo, fato WHERE fato.fonte_verificacao = 'Ata da reunião de 18/11/2026';


WITH novo AS (
  INSERT INTO feedback (data_emissao, descricao, status, visibilidade, id_emissor, id_receptor) VALUES (
    '2026-11-18 16:00',
    'Bom acompanhamento dos chamados ao longo da Sprint #2.',
    'enviado',
    'compartilhado com gestor',
    (SELECT id_colaborador FROM colaborador WHERE email = 'ana.costa@empresa.com'),
    (SELECT id_colaborador FROM colaborador WHERE email = 'lucas.pereira@empresa.com')
  )
  RETURNING id_feedback
),
positivo AS (
  INSERT INTO feedback_positivo (id_feedback, conquista, descricao_impacto)
  SELECT id_feedback, 'Agilidade nos chamados da Sprint #2', 'A fila de atendimento fechou zerada na semana.' FROM novo
)
INSERT INTO feedback_fato (id_feedback, id_fato)
SELECT novo.id_feedback, fato.id_fato FROM novo, fato WHERE fato.fonte_verificacao = 'Fila de chamados da semana';

COMMIT;
