import 'dotenv/config'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import { criarTabelas, explicarErroDeConexao } from './db/tabelas.js'
import equipes from './routes/equipes.js'
import colaboradores from './routes/colaboradores.js'
import fatos from './routes/fatos.js'
import feedbacks from './routes/feedbacks.js'
import acoes from './routes/acoes.js'
import relatorios from './routes/relatorios.js'

const app = express()
const porta = Number(process.env.PORT) || 3000

app.use(cors())
app.use(express.json())
app.use(express.static(fileURLToPath(new URL('../frontend', import.meta.url))))

app.use('/api/equipes', equipes)
app.use('/api/colaboradores', colaboradores)
app.use('/api/fatos', fatos)
app.use('/api/feedbacks', feedbacks)
app.use('/api/acoes', acoes)
app.use('/api/relatorios', relatorios)

try {
  await criarTabelas()
} catch (erro) {
  console.error(`Não foi possível preparar o banco: ${explicarErroDeConexao(erro)}`)
  process.exit(1)
}

app.listen(porta, () => {
  console.log(`Banco "${process.env.DB_NAME}" pronto. Servidor rodando em http://localhost:${porta}`)
})
