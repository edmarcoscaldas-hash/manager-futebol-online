-- Manager Futebol Online: renomeia somente registros com nome duplicado.
-- Preserva IDs, clubes, posições, Overall, contratos e demais dados.
-- Execute no Supabase SQL Editor após revisar o resultado do SELECT de prévia.

begin;

create temporary table mfo_duplicate_player_names on commit drop as
with ranked as (
  select
    p.id,
    p.nome as nome_antigo,
    coalesce(nullif(trim(c.pais), ''), nullif(trim(p.nacionalidade), ''), 'Brasil') as pais_base,
    row_number() over (
      partition by lower(trim(p.nome))
      order by p.created_at nulls last, p.id
    ) as duplicate_rank
  from public.players p
  left join public.clubs c on c.id = p.club_id
  where p.nome is not null and trim(p.nome) <> ''
),
to_rename as (
  select
    id,
    nome_antigo,
    pais_base,
    row_number() over (
      partition by lower(trim(pais_base))
      order by lower(trim(nome_antigo)), id
    ) as seq
  from ranked
  where duplicate_rank > 1
),
name_parts as (
  select
    *,
    case
      when pais_base ilike '%argentina%' then array['Mateo','Santiago','Thiago','Nicolás','Joaquín','Benjamín','Lautaro','Franco','Tomás','Facundo','Agustín','Valentín','Bruno','Julián','Ramiro','Ignacio','Emiliano','Dylan','Gabriel','Máximo']
      when pais_base ilike '%inglaterra%' or pais_base ilike '%england%' then array['Oliver','George','Harry','Jack','Noah','Charlie','Thomas','Oscar','James','William','Henry','Alfie','Theodore','Archie','Freddie','Leo','Arthur','Ethan','Mason','Jacob']
      when pais_base ilike '%espanha%' or pais_base ilike '%spain%' then array['Hugo','Martín','Lucas','Mateo','Leo','Daniel','Alejandro','Pablo','Manuel','Álvaro','Adrián','Enzo','Mario','Diego','Bruno','Marcos','Izan','Sergio','Nicolás','Thiago']
      when pais_base ilike '%alemanha%' or pais_base ilike '%germany%' then array['Lukas','Leon','Paul','Jonas','Finn','Ben','Noah','Elias','Felix','Luis','Maximilian','Emil','Moritz','Anton','Theo','Jakob','Niklas','Tim','David','Julian']
      when pais_base ilike '%italia%' or pais_base ilike '%italy%' then array['Leonardo','Francesco','Alessandro','Lorenzo','Mattia','Andrea','Gabriele','Riccardo','Tommaso','Edoardo','Federico','Nicolo','Giovanni','Filippo','Marco','Luca','Pietro','Samuele','Davide','Matteo']
      when pais_base ilike '%portugal%' then array['João','Francisco','Afonso','Martim','Tomás','Duarte','Gabriel','Guilherme','Miguel','Rodrigo','Diogo','Rafael','Pedro','Tiago','Gonçalo','Henrique','David','Mateus','Bruno','André']
      when pais_base ilike '%frança%' or pais_base ilike '%france%' then array['Lucas','Hugo','Louis','Gabriel','Jules','Arthur','Raphaël','Léo','Maël','Noah','Adam','Ethan','Paul','Nathan','Mathis','Théo','Enzo','Tom','Antoine','Maxime']
      when pais_base ilike '%estados unidos%' or pais_base ilike '%united states%' or pais_base ilike '%usa%' then array['Liam','Noah','James','William','Benjamin','Lucas','Henry','Theodore','Jack','Levi','Alexander','Jackson','Mateo','Daniel','Michael','Mason','Logan','Ethan','Jacob','Owen']
      when pais_base ilike '%méxico%' or pais_base ilike '%mexico%' then array['Santiago','Mateo','Sebastián','Leonardo','Matías','Emiliano','Diego','Daniel','Miguel','Alejandro','Gael','Pablo','Lucas','Joaquín','Adrián','David','Ángel','Fernando','Andrés','Nicolás']
      else array['Lucas','Gabriel','Matheus','Pedro','Rafael','Guilherme','João','Miguel','Arthur','Davi','Bernardo','Heitor','Enzo','Samuel','Theo','Felipe','Nicolas','Lorenzo','Murilo','Gustavo']
    end as primeiros,
    case
      when pais_base ilike '%argentina%' then array['González','Rodríguez','Gómez','Fernández','López','Díaz','Martínez','Pérez','Romero','Sosa','Torres','Álvarez','Ruiz','Ramírez','Flores','Acosta','Benítez','Medina','Herrera','Castro']
      when pais_base ilike '%inglaterra%' or pais_base ilike '%england%' then array['Smith','Jones','Taylor','Brown','Williams','Wilson','Johnson','Davies','Robinson','Wright','Thompson','Evans','Walker','White','Edwards','Green','Hall','Wood','Harris','Lewis']
      when pais_base ilike '%espanha%' or pais_base ilike '%spain%' then array['García','Fernández','González','Rodríguez','López','Martínez','Sánchez','Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez']
      when pais_base ilike '%alemanha%' or pais_base ilike '%germany%' then array['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Schäfer','Koch','Bauer','Richter','Klein','Wolf','Neumann','Schwarz','Zimmermann','Krüger']
      when pais_base ilike '%italia%' or pais_base ilike '%italy%' then array['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Costa','Giordano','Mancini','Lombardi','Moretti','Barbieri']
      when pais_base ilike '%portugal%' then array['Silva','Santos','Ferreira','Pereira','Oliveira','Costa','Rodrigues','Martins','Jesus','Sousa','Fernandes','Gonçalves','Gomes','Lopes','Marques','Alves','Almeida','Ribeiro','Carvalho','Teixeira']
      when pais_base ilike '%frança%' or pais_base ilike '%france%' then array['Martin','Bernard','Thomas','Petit','Robert','Richard','Durand','Dubois','Moreau','Laurent','Simon','Michel','Lefebvre','Leroy','Roux','David','Bertrand','Morel','Fournier','Girard']
      when pais_base ilike '%estados unidos%' or pais_base ilike '%united states%' or pais_base ilike '%usa%' then array['Johnson','Smith','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee']
      when pais_base ilike '%méxico%' or pais_base ilike '%mexico%' then array['Hernández','García','Martínez','López','González','Pérez','Rodríguez','Sánchez','Ramírez','Cruz','Flores','Gómez','Morales','Vázquez','Reyes','Jiménez','Torres','Díaz','Ruiz','Álvarez']
      else array['Silva','Santos','Oliveira','Souza','Pereira','Lima','Costa','Ferreira','Rodrigues','Almeida','Nascimento','Araújo','Ribeiro','Carvalho','Gomes','Martins','Rocha','Barbosa','Alves','Monteiro']
    end as sobrenomes
  from to_rename
)
select
  id,
  nome_antigo,
  pais_base,
  (
    primeiros[(((seq - 1) / 20)::integer % 20) + 1] || ' ' ||
    sobrenomes[((seq - 1) % 20)::integer + 1]
  ) as nome_base,
  seq
from name_parts;

-- Prévia: quantos registros serão renomeados.
do $$
declare
  total integer;
begin
  select count(*) into total from mfo_duplicate_player_names;
  raise notice 'Jogadores que receberão novos nomes: %', total;
end $$;

-- Atualiza somente os nomes repetidos, preservando todos os demais campos.
update public.players p
set nome = case
  when exists (
    select 1
    from public.players other
    where lower(trim(other.nome)) = lower(trim(m.nome_base))
      and other.id <> p.id
      and not exists (
        select 1 from mfo_duplicate_player_names changing
        where changing.id = other.id
      )
  )
  then m.nome_base || ' ' || lpad(m.seq::text, 3, '0')
  when m.seq > 400 then m.nome_base || ' ' || lpad(m.seq::text, 3, '0')
  else m.nome_base
end
from mfo_duplicate_player_names m
where p.id = m.id;

commit;

-- Verificação final: deve retornar zero linhas.
select lower(trim(nome)) as nome, count(*) as quantidade
from public.players
group by lower(trim(nome))
having count(*) > 1
order by quantidade desc;
