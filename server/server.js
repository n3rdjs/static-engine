const express = require('express');
const { staticEngine } = require('../engine');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const analyze = require('./analyze');
const app = express();

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/static', express.static(path.join(__dirname, 'public')));

app.get('', (req, res) => {
	res.render('index');
});


app.post('/test', (req, res) => {
	var source = req.body.source || '';
	var result = (new staticEngine(source)).analyze();
	console.log(result);
	res.render('result', { result: result });
});

app.post('/analyze', (req, res) => {
	res.send(analyze(req.body.code));
})

app.listen(8080);
