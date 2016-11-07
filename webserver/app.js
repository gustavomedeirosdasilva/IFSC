var express = require('express');
var app = express();
var router = require('./routes/index')

// TESTES
/*
app.get('/',
    function(req, res)
    {
        res.send('Ola mundo nodejs express');
    }
);
*/
app.get('/', function(req, res) {
    res.status(200);
    res.send('{"teste": "opa"}');
});
// END TESTES

methodNotAllowed = function(req, res)
{
    res.status(405);
    res.send('405 Method Not Allowed');
};


app.post('/login', router.login).all('/login', methodNotAllowed);


var server = app.listen(3000);
console.log('Servidor Express: porta %s', server.address().port);
