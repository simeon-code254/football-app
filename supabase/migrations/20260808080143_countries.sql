-- Africa-only country list. A lookup table (not an enum) so scope can widen
-- later by inserting rows, no migration/enum-alter needed. Codes/names match
-- app/src/constants/africanCountries.ts exactly so client and server agree.

create table public.countries (
  code text primary key,
  name text unique not null,
  is_active boolean not null default true
);

alter table public.countries enable row level security;

create policy countries_select_all on public.countries
  for select using (true);

insert into public.countries (code, name) values
  ('DZ','Algeria'), ('AO','Angola'), ('BJ','Benin'), ('BW','Botswana'),
  ('BF','Burkina Faso'), ('BI','Burundi'), ('CV','Cabo Verde'), ('CM','Cameroon'),
  ('CF','Central African Republic'), ('TD','Chad'), ('KM','Comoros'),
  ('CG','Congo (Brazzaville)'), ('CD','Congo (DRC)'), ('DJ','Djibouti'),
  ('EG','Egypt'), ('GQ','Equatorial Guinea'), ('ER','Eritrea'), ('SZ','Eswatini'),
  ('ET','Ethiopia'), ('GA','Gabon'), ('GM','Gambia'), ('GH','Ghana'),
  ('GN','Guinea'), ('GW','Guinea-Bissau'), ('CI','Ivory Coast'), ('KE','Kenya'),
  ('LS','Lesotho'), ('LR','Liberia'), ('LY','Libya'), ('MG','Madagascar'),
  ('MW','Malawi'), ('ML','Mali'), ('MR','Mauritania'), ('MU','Mauritius'),
  ('MA','Morocco'), ('MZ','Mozambique'), ('NA','Namibia'), ('NE','Niger'),
  ('NG','Nigeria'), ('RW','Rwanda'), ('ST','Sao Tome and Principe'),
  ('SN','Senegal'), ('SC','Seychelles'), ('SL','Sierra Leone'), ('SO','Somalia'),
  ('ZA','South Africa'), ('SS','South Sudan'), ('SD','Sudan'), ('TZ','Tanzania'),
  ('TG','Togo'), ('TN','Tunisia'), ('UG','Uganda'), ('ZM','Zambia'), ('ZW','Zimbabwe');
