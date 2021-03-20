const express = require('express');
const setProduct = require("./product.js")
const setUsers = require('./users.js')
const image = require('./image.js')
const http = require('http')
const app = require("express")()
const server = http.createServer(app)
const cors = require('cors')

app.use(cors())
app.use(setUsers)
app.use(setProduct)
app.use(image)

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => { console.log(` API  sur le port ${PORT}`) })