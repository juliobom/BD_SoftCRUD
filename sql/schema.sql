CREATE TABLE IF NOT EXISTS equipe (
  id_equipe          SERIAL PRIMARY KEY,
  nome               VARCHAR(120) NOT NULL,
  descricao          TEXT,
  data_criacao       DATE NOT NULL DEFAULT CURRENT_DATE,
  id_equipe_superior INT REFERENCES equipe (id_equipe),
  CONSTRAINT equipe_nao_pode_ser_superior_de_si_mesma CHECK (id_equipe_superior <> id_equipe)
);

CREATE TABLE IF NOT EXISTS colaborador (
  id_colaborador SERIAL PRIMARY KEY,
  nome           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,
  cargo          VARCHAR(120) NOT NULL,
  data_cadastro  DATE NOT NULL DEFAULT CURRENT_DATE,
  status_conta   VARCHAR(10) NOT NULL DEFAULT 'ativa',
  id_equipe      INT NOT NULL REFERENCES equipe (id_equipe),
  CONSTRAINT colaborador_email_unico UNIQUE (email),
  CONSTRAINT colaborador_status_ativa_ou_inativa CHECK (status_conta IN ('ativa', 'inativa'))
);

CREATE TABLE IF NOT EXISTS fato (
  id_fato           SERIAL PRIMARY KEY,
  descricao         TEXT NOT NULL,
  data_ocorrencia   DATE NOT NULL,
  data_registro     TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP(0),
  contexto          TEXT NOT NULL,
  fonte_verificacao TEXT NOT NULL,
  id_colaborador    INT NOT NULL REFERENCES colaborador (id_colaborador),
  CONSTRAINT fato_ocorrencia_nao_pode_ser_depois_do_registro CHECK (data_ocorrencia <= data_registro::date)
);

CREATE TABLE IF NOT EXISTS feedback (
  id_feedback      SERIAL PRIMARY KEY,
  data_emissao     TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP(0),
  descricao        TEXT NOT NULL,
  status           VARCHAR(12) NOT NULL DEFAULT 'rascunho',
  visibilidade     VARCHAR(30) NOT NULL DEFAULT 'privado',
  exibicao_anonima BOOLEAN NOT NULL DEFAULT FALSE,
  id_emissor       INT NOT NULL REFERENCES colaborador (id_colaborador),
  id_receptor      INT NOT NULL REFERENCES colaborador (id_colaborador),
  CONSTRAINT feedback_emissor_diferente_do_receptor CHECK (id_emissor <> id_receptor),
  CONSTRAINT feedback_status_permitido CHECK (status IN ('rascunho', 'enviado', 'confirmado')),
  CONSTRAINT feedback_visibilidade_permitida CHECK (visibilidade IN ('privado', 'compartilhado com gestor', 'público'))
);

CREATE TABLE IF NOT EXISTS feedback_positivo (
  id_feedback       INT PRIMARY KEY REFERENCES feedback (id_feedback) ON DELETE CASCADE,
  conquista         TEXT NOT NULL,
  descricao_impacto TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_construtivo (
  id_feedback   INT PRIMARY KEY REFERENCES feedback (id_feedback) ON DELETE CASCADE,
  area_melhoria TEXT NOT NULL,
  sugestao      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_fato (
  id_feedback INT NOT NULL REFERENCES feedback (id_feedback) ON DELETE CASCADE,
  id_fato     INT NOT NULL REFERENCES fato (id_fato) ON DELETE CASCADE,
  PRIMARY KEY (id_feedback, id_fato)
);

CREATE TABLE IF NOT EXISTS acao (
  id_feedback    INT NOT NULL REFERENCES feedback_construtivo (id_feedback) ON DELETE CASCADE,
  nr_sequencial  INT NOT NULL,
  descricao      TEXT NOT NULL,
  prazo          DATE NOT NULL,
  status         VARCHAR(12) NOT NULL DEFAULT 'pendente',
  id_responsavel INT NOT NULL REFERENCES colaborador (id_colaborador),
  PRIMARY KEY (id_feedback, nr_sequencial),
  CONSTRAINT acao_numero_maior_que_zero CHECK (nr_sequencial > 0),
  CONSTRAINT acao_status_permitido CHECK (status IN ('pendente', 'em andamento', 'concluída'))
);

CREATE OR REPLACE VIEW vw_feedback AS
SELECT
  fb.id_feedback,
  CASE WHEN fp.id_feedback IS NOT NULL THEN 'positivo' ELSE 'construtivo' END AS tipo,
  fb.data_emissao,
  fb.descricao,
  fb.status,
  fb.visibilidade,
  fb.exibicao_anonima,
  fb.id_emissor,
  emissor.nome AS emissor_nome,
  emissor.id_equipe AS id_equipe_emissor,
  fb.id_receptor,
  receptor.nome AS receptor_nome,
  receptor.id_equipe AS id_equipe_receptor,
  equipe_receptor.nome AS equipe_receptor_nome,
  equipe_receptor.id_equipe_superior AS id_equipe_gestora,
  fp.conquista,
  fp.descricao_impacto,
  fc.area_melhoria,
  fc.sugestao,
  (SELECT COUNT(*) FROM feedback_fato ff WHERE ff.id_feedback = fb.id_feedback)::int AS total_fatos,
  (SELECT COUNT(*) FROM acao a WHERE a.id_feedback = fb.id_feedback)::int AS total_acoes
FROM feedback fb
JOIN colaborador emissor ON emissor.id_colaborador = fb.id_emissor
JOIN colaborador receptor ON receptor.id_colaborador = fb.id_receptor
JOIN equipe equipe_receptor ON equipe_receptor.id_equipe = receptor.id_equipe
LEFT JOIN feedback_positivo fp ON fp.id_feedback = fb.id_feedback
LEFT JOIN feedback_construtivo fc ON fc.id_feedback = fb.id_feedback;

-- RN05: privado (emissor e receptor), compartilhado com gestor (+ equipe superior) e público (+ equipe do receptor)
CREATE OR REPLACE FUNCTION pode_ver_feedback(id_do_feedback INT, id_do_usuario INT)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT
    f.id_emissor = id_do_usuario
    OR (f.status <> 'rascunho' AND (
      f.id_receptor = id_do_usuario
      OR (f.visibilidade IN ('compartilhado com gestor', 'público') AND f.id_equipe_gestora = usuario.id_equipe)
      OR (f.visibilidade = 'público' AND f.id_equipe_receptor = usuario.id_equipe)
    ))
  FROM vw_feedback f
  JOIN colaborador usuario ON usuario.id_colaborador = id_do_usuario
  WHERE f.id_feedback = id_do_feedback
$$;
