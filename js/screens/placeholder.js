// Écran provisoire pour les fonctionnalités des jalons suivants.
import { esc } from '../ui.js';

export function placeholder(title, text, { nav = false, back = 'accueil' } = {}) {
  return {
    nav,
    render() {
      return `
        <h1 class="h1">${esc(title)}</h1>
        <div class="lg card"><p class="lead">${esc(text)}</p></div>
        <div class="spacer"></div>
        <a class="lgg btn btn-secondary" href="#/${back}">Retour</a>`;
    },
  };
}
