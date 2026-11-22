bibliografia pool (metodos de usos: https://node-postgres.com/apis/pool)
express (https://expressjs.com/en/5x/starter/installing/)
cors (https://expressjs.com/pt-br/resources/middleware/cors/)
pool (https://node-postgres.com/apis/pool)

console.log('serve_rodando🚀🚀')

npm install pg dotenv


try {

    const usuario = await BuscarUser();

    console.table(usuario);

} catch (erro) {
    console.error('Erro ao Buscar User. COD:', erro.message)

}