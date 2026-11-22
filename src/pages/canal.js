const formulario = document.querySelector('#formUser')



formulario.addEventListener('submit', async function (event){
    console.log('entrouu')
    event.preventDefault();

    const dados = new FormData(formulario)

    const user = {

        nome: dados.get('formnome'),
        idade: dados.get('formidade'),
        cargo: dados.get('formcargo'),
        status_conta: dados.get('formstatus')

    }
    console.log(user)
    
    const resposta = await fetch('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(user)
    })

    const sinal = await response.json()
    console.log(sinal)
    

    console.log('usuario criado', resultado);
    formulario.reset()
    console.log(user)

})




