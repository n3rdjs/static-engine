const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('', (req, res) => {
	res.render('index');
});

app.post('/test', (req, res) => {
	var source = req.body.source || '';
	fs.writeFileSync('/tmp/input.js', source);
	var result = require('child_process').execSync('node index.js /tmp/input.js');
	res.render('result', { result, result });
});

app.listen(8080);
