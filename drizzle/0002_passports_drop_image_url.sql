-- WI-0008: a foto da 42 deixou de se guardar (regra 9: se não se mostra, não
-- se guarda). Tira o imageUrl dos snapshots já guardados.
UPDATE "passports" SET "snapshot" = "snapshot" - 'imageUrl' WHERE "snapshot" ? 'imageUrl';
