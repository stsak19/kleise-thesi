-- 011: Ο ιδιοκτήτης διαλέγει αν το τηλέφωνο του καταστήματος φαίνεται στους πελάτες.
-- Προεπιλογή: φαίνεται (όπως πριν). Ασφαλές να τρέξει ξανά.

alter table businesses add column if not exists show_phone boolean not null default true;
