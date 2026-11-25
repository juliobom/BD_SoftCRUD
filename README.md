# Feedback 360

Sistema de feedback com fatos, plano de ação e relatórios. Node.js + Express + PostgreSQL.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL rodando (pode ser gerenciado pelo pgAdmin)

## Como rodar

1. Crie o banco no pgAdmin (ou no psql):

   ```sql
   CREATE DATABASE feedback360;
   ```

2. Confira o `.env` com os dados do seu PostgreSQL:

   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=feedback360
   DB_USER=postgres
   DB_PASSWORD=postgres

   PORT=3000
   ```

3. Instale as dependências e inicie:

   ```
   npm install
   npm start
   ```

   Ao iniciar, as tabelas são criadas automaticamente. Acesse http://localhost:3000

## Comandos

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor e cria as tabelas, se ainda não existirem |
| `npm run dev` | Igual ao `start`, mas reinicia ao salvar um arquivo |
| `npm run db:seed` | Insere os dados de exemplo |
| `npm run db:seed:limpar` | Apaga apenas os dados de exemplo |

## Estrutura

```
sql/schema.sql         tabelas, view e função de visibilidade
sql/seed.sql           dados de exemplo
sql/limpar-seed.sql    remove os dados de exemplo
src/app.js             servidor
src/db/pool.js         conexão com o banco
src/regras.js          regras de negócio (RN01 a RN10)
src/routes/            rotas da API
frontend/              telas
```

## Referências

- node-postgres (pool): https://node-postgres.com/apis/pool
- Express: https://expressjs.com/en/5x/starter/installing/
- CORS: https://expressjs.com/pt-br/resources/middleware/cors/
