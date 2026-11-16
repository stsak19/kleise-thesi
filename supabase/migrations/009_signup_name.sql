-- SpotOn 009: το όνομα της εγγραφής πάει στο προφίλ, ακόμα κι όταν ζητείται επιβεβαίωση email
-- (τότε η εφαρμογή δεν έχει ακόμα σύνδεση για να το γράψει η ίδια). Τρέχει ξανά χωρίς πρόβλημα.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare full text := btrim(coalesce(new.raw_user_meta_data->>'full_name', ''));
begin
  insert into profiles(id, first_name, last_name)
  values (new.id, coalesce(split_part(full, ' ', 1), ''), btrim(substr(full, length(split_part(full, ' ', 1)) + 1)))
  on conflict (id) do nothing;
  return new;
end $$;
