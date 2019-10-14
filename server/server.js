const express = require('express');
const { staticEngine } = require('../engine');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const analyze = require('./analyze');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/static', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/analyze', (req, res) => {
	res.send(analyze(req.body.code));
})

app.listen(8080);
