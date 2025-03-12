const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');
//Database credentials
const knex = require('knex')({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        port: 5555,
        user: '',
        password: '',
        database: '',
    }
});

//Port on which this server will run
const port = 3000;

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    console.log("GET request sent for / with body: ", req.body);
    res.json("Success");
})

app.post('/login', (req, res) => {
    console.log("POST request sent from /login with body: ", req.body);
    knex.select('email', 'hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            if(crypto.createHash('md5').update(req.body.password).digest('hex') === data[0].hash){
                return knex.select('*').from('users').where('email', '=', req.body.email).then(user => {
                    res.json(user[0]);
                }).catch(err => res.status(400).json('Unable to get user'))
            } else {
                res.status(400).json('Wrong credentials');
            }
        })
        .catch(err => res.status(400).json('Invalid credentials'));
})

app.post('/register', (req, res) =>{
    console.log("POST request for /register with body: ", req.body);
    if(req.body.email != '' && req.body.password != '' && req.body.name != ''){
        const { email, password, name } = req.body;
        const hash = crypto.createHash('md5').update(password).digest('hex');

        knex.transaction(trx => {
            trx.insert({
                hash: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                .returning('*')
                .insert({
                    email: loginEmail[0].email,
                    name: name,
                    joined: new Date()
                })
                .then(user => {
                    res.json(user[0]);
                })
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })
       .catch(err => res.status(400).json('Unable to register'));
    } else {
        res.status(400).json("Invalid credentials");
    }
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    knex.select('*')
        .from('users')
        .where({
            id: id
        })
        .then(user => {
            if(user.length){
                res.json(user[0]);
            } else {
                res.status(400).json('User not found');
            }
        })
        .catch(err => res.status(400).json('Error'));
})

app.listen(port, ()=>{
    console.log('App is running on port:', port);
})