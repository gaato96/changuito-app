// Ícono de la app (carrito blanco sobre Verde Changuito), dibujado con código para generar PNG de cualquier tamaño.
import { ImageResponse } from 'next/og';

const CART = 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z';

/** maskable: deja margen de seguridad para íconos recortados en círculo (Android). */
export function appIcon(size: number, { maskable = false, rounded = true } = {}) {
  const glyph = Math.round(size * (maskable ? 0.5 : 0.62));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${glyph}" height="${glyph}"><path fill="#ffffff" d="${CART}"/></svg>`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1F7A4D', borderRadius: rounded && !maskable ? size * 0.22 : 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} width={glyph} height={glyph} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
