create table if not exists setor (
  id serial primary key,
  nome text not null unique
);

create table if not exists funcionario (
  id serial primary key,
  nome text not null,
  email text not null unique,
  setor_id int references setor(id),
  cargo text
);

insert into setor (nome) values ('TI'), ('Atendimento')
on conflict (nome) do nothing;

insert into funcionario (nome, email, setor_id, cargo) values
('May', 'may@example.com', 1, 'QA')
on conflict (email) do nothing;
