const { json } = require('express')
const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const createRequest = require('./index').createRequest

app.use(json())

app.post('/', async (req, res) => {
    console.log("POST DATA: ", req.body)
    createRequest(req.body, (status, result) => {
        console.log("Result: ", result)
        res.status(status).json(result)
    })
})

app.listen(port, () => console.log(`App is listening on port ${port}`))