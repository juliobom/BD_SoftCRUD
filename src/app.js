import {BuscarUser} from './db/table.js'
import {CriarUser} from './db/table.js'
import express from 'express'
import cors from 'cors'
//const express = require('express');

const app = express()
const port = 3000

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())


app.get('/api/usuarios', (req,res) =>{

    
    

})

app.post('/api/usuarios', async (req,res) => {
    
    const user = req.body
    console.log(user)
    try {
        const usuariocriado = await CriarUser(user)
        res.status(201).json(usuariocriado)
    } catch (erro) {
        console.error(erro)
        res.status(500).json({ erro: 'erro ao criar usuario'})
    }

})


app.listen(port, () => {

    console.log(`servidor rodando na porta ${port}`)
})


