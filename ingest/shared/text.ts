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

/**
 * Nombre para mostrar a partir de SEPA: saca el código de presentación de Cencosud ("BRK-1000-ml.")
 * y pasa a minúsculas los nombres escritos todo en mayúsculas ("TAPA DE NALGA E/V**, FB MEATS, 1 kgr").
 */
export function prettySepaName(raw: string): string {
  let s = raw.replace(/\s+[A-Za-z/]{2,4}-[\d.,]+-\s*[A-Za-z]+\.?\s*$/, '').replace(/\*+/g, '').replace(/\s+,/g, ',').trim();
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length;
  if (letters && upper / letters.length > 0.8) s = s.toLowerCase();
  s = s.replace(/\s+/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
