# IFSC-SDR

Projeto IFSC-SDR desenvolvido na disciplina de Circuitos de Rádio Frequência (CRF29009 2017/1) do curso Engenharia de Telecomunicações - IFSC São José.

Desenvolvido pelos alunos: Gabriel Cantu, Gustavo Paulo Medeiros da Silva e Iago Soares.

## Instalação

Instalar o [Node.js](https://nodejs.org/en/download/package-manager/) e o [GNU radio](https://wiki.gnuradio.org/index.php/InstallingGR).
Após a instalação entrar no diretório `webserver` e executar o comando: 
```
npm install
```

## Execução

Ainda no diretório `webserver` executer o seguinte comando:
```
npm start
```

Retorne ao diretório acima e em um novo terminal execute:
```
python top_block.py
```

Ou abra o GNU radio e clique no botão de play:
```
gnuradio-companion sdr.grc
```

Por último, abra o seguinte endereço no navegador web:
```
127.0.0.1:8080
```
