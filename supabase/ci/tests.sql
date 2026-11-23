-- Μικρά tests των συναρτήσεων της βάσης. Τρέχουν στο CI (scripts/elegxos-sql.sh) μετά από όλα τα migrations,
-- μέσα σε transaction που στο τέλος ακυρώνεται. ΔΕΝ τρέχουν ποτέ στην πραγματική βάση.
-- Αποτυχία = exception με το τι περίμενε και τι βρήκε.
begin;

create function pg_temp.eq(got anyelement, want anyelement, what text) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'TEST «%»: περίμενα %, βρήκα %', what, want, got; end if;
end $$;

-- 020: slug από το ελληνικό όνομα
select pg_temp.eq(slugify_el('Κομμωτήριο «Η Μαρία» & Σία'), 'kommotirio-i-maria-sia', 'slugify_el με σύμβολα');
select pg_temp.eq(slugify_el('Γυμναστήριο Ψυχικού'), 'gymnastirio-psychikou', 'slugify_el ψ/χ');
select pg_temp.eq(slugify_el('Θεσσαλονίκη'), 'thessaloniki', 'slugify_el θ');
select pg_temp.eq(slugify_el('!!!'), 'katastima', 'slugify_el κενό');

-- 020: δύο καταστήματα με το ίδιο όνομα, αλλαγή ονόματος, παλιός σύνδεσμος
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000000a');
insert into businesses(id, owner_id, name, category, city) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Κουρείο Νίκος', (enum_range(null::business_category))[1], 'Πάτρα'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Κουρείο Νίκος', (enum_range(null::business_category))[1], 'Πάτρα');
select pg_temp.eq((select slug from businesses where id = '00000000-0000-0000-0000-0000000000a1'), 'koureio-nikos', 'πρώτο slug');
select pg_temp.eq((select slug from businesses where id = '00000000-0000-0000-0000-0000000000a2'), 'koureio-nikos-2', 'δεύτερο slug με -2');
update businesses set name = 'Barber Νίκος' where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.eq((select slug from businesses where id = '00000000-0000-0000-0000-0000000000a1'), 'barber-nikos', 'νέο slug μετά την αλλαγή ονόματος');
select pg_temp.eq(store_by_slug('koureio-nikos')->>'id', '00000000-0000-0000-0000-0000000000a1', 'ο παλιός σύνδεσμος βρίσκει το κατάστημα');
select pg_temp.eq(store_by_slug('KOUREIO-NIKOS')->>'slug', 'barber-nikos', 'ο παλιός σύνδεσμος δίνει το νέο slug');
select pg_temp.eq(store_by_slug('den-yparxei'), null::jsonb, 'άγνωστο slug');

-- 005: ώρα Αθήνας
select pg_temp.eq(athens_today(), (now() at time zone 'Europe/Athens')::date, 'athens_today');

rollback;
\echo 'Όλα τα tests της βάσης πέρασαν.'
