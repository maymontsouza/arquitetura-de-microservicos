do $$ begin
  create type status_chamado as enum(
    'Aberto','EmAndamento','AguardandoResposta','Resolvido','Fechado'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists chamado (
  id serial primary key,
  titulo text not null,
  descricao text not null,
  status status_chamado not null default 'Aberto',
  data_abertura timestamptz not null default now(),
  data_ultima_atualizacao timestamptz not null default now(),
  setor_destino_id int not null,
  solicitante_id int not null
);

insert into chamado (titulo, descricao, setor_destino_id, solicitante_id)
values ('Erro na tela', 'Não carrega', 2, 1)
on conflict do nothing;
