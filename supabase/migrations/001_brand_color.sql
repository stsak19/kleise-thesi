-- Χρώμα καταστήματος: κάθε επιχείρηση διαλέγει το δικό της (μορφή #RRGGBB).
alter table businesses add column if not exists brand_color text
  check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$');
