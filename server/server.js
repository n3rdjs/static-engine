const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const examples = fs.readdirSync(path.join(__dirname, 'examples'));

if (!examples.length) {
	res.end('no input files');
	return;
}

const analyze = require('./analyze');
const app = express();

app.engine('html', require('ejs').renderFile);
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'html');

app.use(bodyParser.urlencoded({ extended: false , limit: '50mb'}));
app.use(bodyParser.json({limit: '50mb'}));

app.use('/static', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
	tryRender(res, 'untitled.js');
});

app.post('/', (req, res) => {
	var { filename } = req.body;
	tryRender(res, filename);
});

app.post('/analyze', (req, res) => {
	try {
		res.json(analyze(req.body.code));
	} catch (e) {
		res.json(e);
	}
})

function tryRender(res, filename) {
    try {
		var basename = path.basename(filename);
		var fullpath = path.join(__dirname, 'examples', basename);

		if (fs.existsSync(fullpath)) {
			var input = fs.readFileSync(path.resolve(__dirname, 'examples', filename));
			res.render('index.html', { input : input, selected : basename, examples : examples.filter(name => name !== basename) });
		}

	} catch(e) {
        throw e;
	}
}

app.listen(8080);
