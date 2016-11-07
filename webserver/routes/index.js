exports.login = function(req, res)
{
console.log(req)
    res.status(200);
    res.send('<h1>Login efetuado com sucesso!</h1>');
};
