// Code de récupération (§10.1) : 12 caractères, format XXXX-XXXX-XXXX.
// Alphabet de 32 caractères sans I ni O : 5 bits par caractère, 60 bits d'entropie.
// Généré sur le téléphone : disponible même hors ligne dès le premier lancement.

export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(cryptoObj = globalThis.crypto) {
  // 256 est un multiple de 32 : « octet & 31 » est parfaitement uniforme.
  const bytes = cryptoObj.getRandomValues(new Uint8Array(12));
  return formatCode([...bytes].map((b) => ALPHABET[b & 31]).join(''));
}

/** Garde lettres et chiffres, en majuscules (« k7m2 9qxp-4tdl » → « K7M29QXP4TDL »). */
export const normCode = (text) => String(text ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Mise en forme XXXX-XXXX-XXXX, aussi pendant la saisie (12 caractères au plus). */
export function formatCode(text) {
  const n = normCode(text).slice(0, 12);
  return n.match(/.{1,4}/g)?.join('-') ?? '';
}

export const isValidCode = (text) => new RegExp(`^[${ALPHABET}]{12}$`).test(normCode(text));
