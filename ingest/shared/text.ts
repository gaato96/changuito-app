// Normalización de texto y de códigos EAN.

/** Minúsculas, sin acentos y con espacios simples. Debe coincidir con la función norm() de la base. */
export function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza un EAN a 13 dígitos. Devuelve null si no es un código válido.
 * Acepta EAN-8, UPC-A (12) y EAN-13/14 (el 14 solo si empieza con 0).
 */
export function ean13(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.length === 14) return d.startsWith('0') ? d.slice(1) : null;
  if (d.length === 8 || d.length === 12 || d.length === 13) return d.padStart(13, '0');
  return null;
}

/** Los EAN que empiezan con 2 son códigos internos o de balanza: no identifican el mismo producto entre cadenas. */
export function isInternalEan(e: string): boolean {
  return e.startsWith('2');
}
