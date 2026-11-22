import { pool } from './db/pool.js'
import {BuscarUser} from './db/table.js'



try {

    const usuario = await BuscarUser();

    console.table(usuario);

} catch (erro) {
    console.error('Erro ao Buscar User. COD:', erro.message)

} finally {
    await pool.end();
}


