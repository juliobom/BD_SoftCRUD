import fs from 'fs'
import { pool } from './pool.js'
import { criarTabelas, explicarErroDeConexao } from './tabelas.js'

const arquivo = process.argv[2]
const limpando = arquivo.includes('limpar')

try {
  await criarTabelas()
  await pool.query(fs.readFileSync(arquivo, 'utf8'))
  console.log(limpando ? 'Dados de exemplo removidos.' : 'Dados de exemplo inseridos.')
} catch (erro) {
  if (erro.code === 'P0001') {
    console.error(erro.message)
  } else if (erro.code === '23503') {
    console.error('Há registros criados manualmente ligados aos dados de exemplo. Remova-os antes de limpar.')
  } else {
    console.error(`Erro: ${explicarErroDeConexao(erro)}`)
  }
  process.exitCode = 1
} finally {
  await pool.end()
}
