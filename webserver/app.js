var express = require('express');
var myParser = require("body-parser");
var app = express();
var router = require('./routes/index')

app.use(myParser.urlencoded({extended : true}));

// TESTES
app.get('/', function(req, res) {
    res.status(200);
    res.json(JSON.parse('{"teste": "opa"}'));
});
// END TESTES

methodNotAllowed = function(req, res)
{
    res.status(405);
    res.send('405 Method Not Allowed');
};

app.post('/login', router.login).all('/login', methodNotAllowed);
app.post('/carga-horaria', router.carga_horaria).all('/carga-horaria', methodNotAllowed);
app.post('/pre-requisito', router.pre-requisito).all('/pre-requisito', methodNotAllowed);


var server = app.listen(3000);
console.log('Servidor Express: porta %s', server.address().port);
