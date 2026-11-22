CREATE TABLE usuario (

    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    idade INT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    cargo VARCHAR(50) NOT NULL,
    status_conta VARCHAR(50) NOT NULL DEFAULT 'ativo'
);

CREATE TABLE equipe (

    id_equipe SERIAL PRIMARY KEY
    id_usuario BIGINT NOT NULL REFERENCES usuario(id),
    nome TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(
);

