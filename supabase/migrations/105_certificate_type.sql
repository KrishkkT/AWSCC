-- Add certificate_type column to certificates table
alter table public.certificates 
add column if not exists certificate_type text check (certificate_type in ('participation', 'achievement', 'excellence', 'winner')) default 'participation';
