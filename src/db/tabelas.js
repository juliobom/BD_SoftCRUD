import fs from 'fs'
import { pool } from './pool.js'

export async function criarTabelas() {
  const schema = fs.readFileSync(new URL('../../sql/schema.sql', import.meta.url), 'utf8')
  await pool.query(schema)
}

export function explicarErroDeConexao(erro) {
  if (erro.code === '3D000') return `O banco "${process.env.DB_NAME}" não existe. Crie com: CREATE DATABASE ${process.env.DB_NAME};`
  if (erro.code === '28P01') return `Usuário ou senha do PostgreSQL incorretos. Confira DB_USER e DB_PASSWORD no .env.`
  if (erro.code === 'ECONNREFUSED') return `PostgreSQL não está rodando em ${process.env.DB_HOST}:${process.env.DB_PORT}.`
  return erro.message
}
