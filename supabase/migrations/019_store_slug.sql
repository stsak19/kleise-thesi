-- 019: Σύνδεσμος καταστήματος με το όνομά του (2026-11-18).
-- Αντί για /store/f692c9d7-ab41-… ο σύνδεσμος γίνεται /store/barber-nikos (λατινικά, πεζά, με παύλες).
-- Το slug φτιάχνεται μόνο του από το όνομα όταν δημιουργείται το κατάστημα και ΔΕΝ αλλάζει όταν αλλάζει το όνομα,
-- ώστε να μη σπάνε οι σύνδεσμοι που έχουν ήδη μοιραστεί. Αν υπάρχει ήδη, παίρνει -2, -3…
-- Οι παλιοί σύνδεσμοι με τον κωδικό (uuid) συνεχίζουν να δουλεύουν.
-- Τρέχει μετά τα 001–018 και μπορεί να ξανατρέξει.

alter table businesses add column if not exists slug text;
do $$ begin
  alter table businesses add constraint businesses_slug_check
    check (slug is null or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60
      and slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'));
exception when duplicate_object then null; end $$;
create unique index if not exists businesses_slug_key on businesses (slug);

-- Ελληνικά → λατινικά για διευθύνσεις: «Κουρείο Νίκος» → kourio-nikos, «Ψυχή & Σώμα» → psychi-soma.
create or replace function slugify_el(p text) returns text language plpgsql immutable as $$
declare t text := lower(coalesce(p, ''));
begin
  t := translate(t, 'άέήίόύώϊϋΐΰ', 'αεηιουωιυιυ');
  t := replace(replace(replace(replace(replace(t, 'ου', 'ou'), 'θ', 'th'), 'χ', 'ch'), 'ψ', 'ps'), 'ξ', 'ks');
  t := replace(replace(t, 'μπ', 'b'), 'ντ', 'nt');
  t := translate(t, 'αβγδεζηικλμνοπρσςτυφω', 'avgdeziiklmnoprsstyfo');
  t := translate(t, 'àáâãäåèéêëìíîïòóôõöùúûüýçñ', 'aaaaaaeeeeiiiiooooouuuuycn');
  t := regexp_replace(t, '&', '-', 'g');
  t := regexp_replace(t, '[^a-z0-9]+', '-', 'g');
  t := btrim(t, '-');
  t := btrim(left(t, 50), '-');
  return case when t = '' then 'katastima' else t end;
end $$;

-- Ελεύθερο slug: το ίδιο ή με -2, -3… (εκτός από το ίδιο το κατάστημα).
create or replace function free_slug(p_base text, p_self uuid) returns text
language plpgsql stable security definer set search_path=public as $$
declare cand text := p_base; n int := 1;
begin
  while exists (select 1 from businesses where slug = cand and id is distinct from p_self) loop
    n := n + 1; cand := p_base || '-' || n;
  end loop;
  return cand;
end $$;
revoke all on function free_slug(text, uuid) from public, anon, authenticated;

-- Νέο κατάστημα (ή χωρίς slug): φτιάχνεται από το όνομα. Αν κάποιος γράψει δικό του slug, καθαρίζεται και γίνεται μοναδικό.
create or replace function business_slug() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    if tg_op = 'UPDATE' and old.slug is not null then new.slug := old.slug;
    else new.slug := free_slug(slugify_el(new.name), new.id); end if;
  elsif tg_op = 'INSERT' or new.slug is distinct from old.slug then
    new.slug := free_slug(slugify_el(new.slug), new.id);
  end if;
  return new;
end $$;
drop trigger if exists businesses_slug on businesses;
create trigger businesses_slug before insert or update on businesses for each row execute function business_slug();

-- Υπάρχοντα καταστήματα: με τη σειρά που φτιάχτηκαν (το παλαιότερο κρατά το σκέτο όνομα).
do $$ declare r record; begin
  for r in select id from businesses where slug is null order by created_at, id loop
    update businesses set slug = null where id = r.id;
  end loop;
end $$;
