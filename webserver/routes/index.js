var mysql      = require('mysql');
var connection = mysql.createConnection
(
	{
		host     : 'localhost',
		user     : 'root',
		password : '',
		database : 'bcd'
	}
);





exports.login = function(req, res)
{
    res.status(200);
    res.send('<h1>Login efetuado com sucesso!</h1>');
};

getCargaHoraria = function(req, res)
{
    var disciplinas = req.body.disciplinas;
    var str = 'select codigo, CH from disciplina where ';
    for (i in disciplinas)
    {
        str += '(codigo = \'' + disciplinas[i].codigo + '\')'
        if (i != disciplinas.length-1)
        {
            str += ' or ';
        }
    }
    str += ';';

    connection.query(str,
        function(err, rows, fields)
        {
            if (!err)
            {
                res.status(200);
                res.json('{\"disciplinas\": ' + JSON.stringify(rows) + '}');
            }
            else
            {
                res.status(503);
                res.send(err);
            }
        }
    );

};

exports.carga_horaria = function(req, res)
{
    getCargaHoraria(req, res);
};

