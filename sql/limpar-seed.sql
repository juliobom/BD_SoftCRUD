BEGIN;

CREATE TEMP TABLE colaboradores_do_seed ON COMMIT DROP AS
SELECT id_colaborador
FROM colaborador
WHERE email IN (
  'carlos.silva@empresa.com',
  'maria.oliveira@empresa.com',
  'joao.santos@empresa.com',
  'pedro.lima@empresa.com',
  'ana.costa@empresa.com',
  'lucas.pereira@empresa.com'
);

DELETE FROM feedback
WHERE id_emissor IN (SELECT id_colaborador FROM colaboradores_do_seed)
   OR id_receptor IN (SELECT id_colaborador FROM colaboradores_do_seed);

DELETE FROM fato
WHERE id_colaborador IN (SELECT id_colaborador FROM colaboradores_do_seed);

DELETE FROM colaborador
WHERE id_colaborador IN (SELECT id_colaborador FROM colaboradores_do_seed);

DELETE FROM equipe WHERE nome = 'Atendimento';
DELETE FROM equipe WHERE nome IN ('Desenvolvimento', 'Suporte');
DELETE FROM equipe WHERE nome = 'Gestão';

COMMIT;
