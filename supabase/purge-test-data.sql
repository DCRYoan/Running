-- =====================================================================
-- Running — vider la base (données de test)
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run.
--
-- Supprime TOUTES les sauvegardes et le journal anti-abus. À faire une fois,
-- avant de confier l'app (les sauvegardes « Test A », « Test B »… des essais).
-- Un téléphone déjà utilisé n'est pas perdu : à sa prochaine ouverture, l'app
-- constate que sa sauvegarde n'existe plus et la recrée avec ses données locales
-- et le même code de récupération.
-- =====================================================================

delete from public.backups;
delete from public.backup_attempts;
