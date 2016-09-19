CREATE TABLE aluno (
    nome varchar[128] not null,
    documento char[11] primary key,
    telefone bigint,
    email varchar[128]
)

CREATE TABLE campus
(
    nome varchar[64] not null,
)

CREATE TABLE curso
(
    numero char(1) primary key,
    CHmin int,
    CHmax int,
    nome varchar[64] not null,
    constraint fk_curso_campus_campus_nome foreign key (campus) references campus(nome)
    
)

CREATE TABLE matricula (
    aluno char(11),
    constraint fk_matricula_curso_curso_numero foreign key (curso) references curso(numero),
    numero char(1) primary key,
    constraint fk_matricula_aluno_aluno_documento foreign key (aluno) references aluno(documento)
)
