import 'dotenv/config'
import pg from 'pg'

pg.types.setTypeParser(pg.types.builtins.DATE, (valor) => valor)
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (valor) => valor.replace(' ', 'T').slice(0, 16))

export const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
})

export async function transacao(executar) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const resultado = await executar(client)
    await client.query('COMMIT')
    return resultado
  } catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  } finally {
    client.release()
  }
}
