const express = require('express')
const app = express()

const oAuth2Data = require('./drive-api-auth.json')
const {google} = require('googleapis')
const CLIENT_ID = oAuth2Data.web.client_id
const CLIENT_SECRET = oAuth2Data.web.client_secret
const REDIRECT_URI = oAuth2Data.web.redirect_uris



app.set('view engine', 'ejs')

app.get('/', (req,res)=>{
    res.render('index')
})

app.listen(3001, () =>{
    console.log('listen to localhost on port 3001')
})