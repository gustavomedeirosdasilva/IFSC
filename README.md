# IFSC-SDR

Projeto IFSC-SDR desenvolvido na disciplina de Circuitos de Rádio Frequência (CRF29009 2017/1) do curso Engenharia de Telecomunicações - IFSC São José.

Desenvolvido pelos alunos: Gabriel Cantu, Gustavo Paulo Medeiros da Silva e Iago Soares.

## Instalação

Instalar o [Node.js](https://nodejs.org/en/download/package-manager/), [rtl-sdr](http://osmocom.org/projects/sdr/wiki/rtl-sdr) e [libcsdr](https://github.com/simonyiszk/csdr)
Após a instalação entrar no diretório `webserver` e executar o comando: 
```
npm install
```

## Execução

Ainda no diretório `webserver` executer o seguinte comando para iniciar o servidor web:
```
npm start
```

Após iniciar o servidor execute o seguinte comando:
```
rtl_sdr -s 2880000 -f 209750000 -g 30 - | nc 127.0.0.1 3333
```

Por último, abra o seguinte endereço no navegador web:
```
127.0.0.1:8080
```
