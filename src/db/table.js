import { pool } from './pool.js'

export async function BuscarUser(){

    const buscar = await pool.query(
        `SELECT * FROM usuario ORDER BY id ASC`
    );
    return buscar.rows;

}

export async function CriarUser(){




}

export async function DelUser(){



}

export async function UpUser(){



}