-- 011: Φωτογραφίες του χώρου για κάθε κατάστημα (έως 8), εκτός από εξώφυλλο και λογότυπο.
-- Ανεβαίνουν στο bucket business-media όπως και τα υπόλοιπα· εδώ κρατιούνται τα δημόσια URL με τη σειρά τους.
-- Ασφαλές να τρέξει ξανά.

alter table businesses add column if not exists photos text[] not null default '{}';
