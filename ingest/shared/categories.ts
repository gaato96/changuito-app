// Mapeo de categorías de cada cadena a las 10 unificadas (data/categorias.json).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { norm } from './text.ts';

export type CategoryConfig = {
  map: Record<string, Record<string, string>>;   // cadena → ruta → slug
  keywords: Record<string, string[]>;            // slug → palabras clave
};

export function loadCategoryConfig(): CategoryConfig {
  return JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'data', 'categorias.json'), 'utf8'));
}

const normPath = (p: string) => '/' + p.split('/').map(s => norm(s)).filter(Boolean).join('/') + '/';

/** Devuelve el slug de la categoría para una ruta VTEX ("/Lácteos/Leches/"), por el prefijo más largo. */
export function makeCategoryResolver(chainMap: Record<string, string>) {
  const entries = Object.entries(chainMap).map(([p, slug]) => [normPath(p), slug] as const).sort((a, b) => b[0].length - a[0].length);
  return (path: string | null | undefined): string | null => {
    if (!path) return null;
    const p = normPath(path);
    return entries.find(([prefix]) => p.startsWith(prefix))?.[1] ?? null;
  };
}

/** Rutas de primer nivel: son las categorías de súper que recorre la ingesta. */
export function topLevelPaths(chainMap: Record<string, string>): string[] {
  return Object.keys(chainMap).filter(p => p.split('/').filter(Boolean).length === 1);
}

/**
 * Clasifica por palabras clave del nombre (para productos de SEPA sin match de EAN en las webs).
 * Gana la palabra que aparece primero ("Aceite Fritolim Manteca" es almacén, no lácteos); a igual posición, la más larga.
 */
export function makeKeywordClassifier(keywords: Record<string, string[]>) {
  const list = Object.entries(keywords).flatMap(([slug, words]) => words.map(w => [norm(w), slug] as const));
  return (name: string): string | null => {
    const n = ` ${norm(name)} `;
    let best: { pos: number; len: number; slug: string } | null = null;
    for (const [w, slug] of list) {
      const pos = n.indexOf(w.startsWith(' ') || w.endsWith(' ') ? w : ` ${w}`);
      if (pos < 0) continue;
      if (!best || pos < best.pos || (pos === best.pos && w.length > best.len)) best = { pos, len: w.length, slug };
    }
    return best?.slug ?? null;
  };
}
