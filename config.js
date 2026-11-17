// Configuration publique de la sauvegarde en ligne (§10).
// Seulement l'URL du projet et la clé PUBLIQUE (« publishable » ou anon).
// Elle est publique par conception : la sécurité repose sur supabase/schema.sql
// (tables fermées, accès uniquement par code de récupération).
// Ne JAMAIS mettre ici la clé service_role / secret.

export const SUPABASE_URL = 'https://xngvvggwchrmdkwofqes.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_LcGJHquPi1CQILNMYEaddQ_fmncM2hF';
