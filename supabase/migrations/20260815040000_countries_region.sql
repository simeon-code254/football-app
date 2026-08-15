-- Real region classification (African Union's 5 standard regional groupings
-- -- North, West, Central, East, Southern -- used for AU governance/seat
-- allocation, not invented for this app) so the player Discover screen can
-- offer a real "Region" filter alongside Country, without duplicating a
-- second freeform taxonomy.
alter table public.countries add column region text;

update public.countries set region = 'North Africa' where code in ('DZ','EG','LY','MA','MR','SD','TN');
update public.countries set region = 'West Africa' where code in ('BJ','BF','CV','CI','GM','GH','GN','GW','LR','ML','NE','NG','SN','SL','TG');
update public.countries set region = 'Central Africa' where code in ('AO','BI','CM','CF','TD','CG','CD','GQ','GA','ST');
update public.countries set region = 'East Africa' where code in ('KM','DJ','ER','ET','KE','MG','RW','SC','SO','SS','TZ','UG');
update public.countries set region = 'Southern Africa' where code in ('BW','SZ','LS','MW','MU','MZ','NA','ZA','ZM','ZW');

alter table public.countries alter column region set not null;
