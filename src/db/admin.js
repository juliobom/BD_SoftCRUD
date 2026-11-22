import { pool } from './pool.js'

export async function bdinit() {

    await pool.query(`
        
        CREATE TABLE usuario(
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            idade INT NULL,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
            cargo TEXT NOT NULL,
            status_conta TEXT NOT NULL DEFAULT 'ativo'
        )                
        `)

}