import { pool } from './pool.js'

//const tabe = document.getElementById('')


console.log('entrou!!')

export async function BuscarUser(){

    const buscar = await pool.query(
        `SELECT * FROM usuarios ORDER BY id ASC`
    );
    return buscar.rows;

}

export async function CriarUser(user){

    const resultado = await pool.query(
    `INSERT INTO usuario (nome,idade,cargo,status_conta) VALUES($1,$2,$3,$4)`, 
    [user.nome, user.idade, user.cargo, user.status_conta]
    );

    return resultado.rows[0]

}

export async function DelUser(){



}

export async function UpUser(){



}