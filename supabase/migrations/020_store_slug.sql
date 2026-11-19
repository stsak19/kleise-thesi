-- 020: Σύνδεσμος καταστήματος με το όνομά του (2026-11-18).
-- Αντί για /store/f692c9d7-ab41-… ο σύνδεσμος γίνεται /store/barber-nikos (λατινικά, πεζά, με παύλες).
-- Το slug φτιάχνεται μόνο του από το όνομα και ΑΛΛΑΖΕΙ όταν αλλάζει το όνομα (επιλογή χρήστη 2026-11-18).
-- Τα παλιά slugs κρατιούνται στο business_old_slugs, οπότε ένας παλιός σύνδεσμος ανοίγει το κατάστημα
-- και η διεύθυνση γίνεται αμέσως η νέα. Αν το slug υπάρχει ήδη, παίρνει -2, -3…
-- Οι σύνδεσμοι με τον κωδικό (uuid) συνεχίζουν να δουλεύουν.
-- Τρέχει μετά τα 001–019 (ανεξάρτητο από το 019_test_payments) και μπορεί να ξανατρέξει.
-- Στη βάση του Στάθη έτρεξε ήδη 2026-11-19 (ως «019»). Μπορεί να ξανατρέξει χωρίς πρόβλημα.

alter table businesses add column if not exists slug text;
do $$ begin
  alter table businesses add constraint businesses_slug_check
    check (slug is null or (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60
      and slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'));
exception when duplicate_object then null; end $$;
create unique index if not exists businesses_slug_key on businesses (slug);

-- Παλιά slugs (μετά από αλλαγή ονόματος): οδηγούν στο κατάστημα με το νέο του όνομα.
-- Καμία πολιτική: διαβάζεται μόνο από την store_by_slug().
create table if not exists business_old_slugs (
  slug text primary key,
  business_id uuid not null references businesses on delete cascade,
  created_at timestamptz not null default now()
);
alter table business_old_slugs enable row level security;

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
  -- Ούτε παλιό slug άλλου καταστήματος: οι παλιοί του σύνδεσμοι να οδηγούν πάντα σε εκείνο.
  while exists (select 1 from businesses where slug = cand and id is distinct from p_self)
     or exists (select 1 from business_old_slugs where slug = cand and business_id is distinct from p_self) loop
    n := n + 1; cand := p_base || '-' || n;
  end loop;
  return cand;
end $$;
revoke all on function free_slug(text, uuid) from public, anon, authenticated;

-- Νέο κατάστημα, χωρίς slug ή με νέο όνομα: το slug βγαίνει από το όνομα. Αν κάποιος γράψει δικό του slug, καθαρίζεται
-- και γίνεται μοναδικό. Το προηγούμενο slug μπαίνει στα παλιά, ώστε οι σύνδεσμοι που έχουν μοιραστεί να μη σπάνε.
create or replace function business_slug() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op = 'INSERT' then
    new.slug := free_slug(slugify_el(coalesce(nullif(btrim(new.slug), ''), new.name)), new.id);
  elsif new.slug is distinct from old.slug and nullif(btrim(new.slug), '') is not null then
    new.slug := free_slug(slugify_el(new.slug), new.id);
  elsif old.slug is null or new.name is distinct from old.name then
    -- Ίδιο όνομα σε λατινικά (π.χ. μόνο τόνος ή κεφαλαία) = ίδιο slug, δεν αλλάζει.
    if old.slug is null or slugify_el(new.name) is distinct from regexp_replace(old.slug, '-[0-9]+$', '') then
      new.slug := free_slug(slugify_el(new.name), new.id);
    else new.slug := old.slug; end if;
  else
    new.slug := old.slug;
  end if;
  if tg_op = 'UPDATE' and old.slug is not null and new.slug is distinct from old.slug then
    insert into business_old_slugs(slug, business_id) values (old.slug, new.id)
      on conflict (slug) do update set business_id = excluded.business_id, created_at = now();
  end if;
  delete from business_old_slugs where slug = new.slug;  -- το slug ανήκει πια σε αυτό το κατάστημα
  return new;
end $$;
drop trigger if exists businesses_slug on businesses;
create trigger businesses_slug before insert or update on businesses for each row execute function business_slug();

-- Από τη διεύθυνση στο κατάστημα: το τωρινό slug, αλλιώς ένα παλιό. Επιστρέφει { id, slug } με το τωρινό slug.
create or replace function store_by_slug(p_slug text) returns jsonb
language sql stable security definer set search_path=public as $$
  select coalesce(
    (select jsonb_build_object('id', b.id, 'slug', b.slug) from businesses b where b.slug = lower(p_slug)),
    (select jsonb_build_object('id', b.id, 'slug', b.slug) from business_old_slugs o join businesses b on b.id = o.business_id where o.slug = lower(p_slug))) $$;
grant execute on function store_by_slug(text) to anon, authenticated;

-- Υπάρχοντα καταστήματα: με τη σειρά που φτιάχτηκαν (το παλαιότερο κρατά το σκέτο όνομα).
do $$ declare r record; begin
  for r in select id from businesses where slug is null order by created_at, id loop
    update businesses set slug = null where id = r.id;
  end loop;
end $$;
