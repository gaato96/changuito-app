// Lectura de los ZIP anidados de SEPA con yauzl (ZIP externo en disco → un ZIP por empresa en memoria).
import yauzl from 'yauzl';
import type { Readable } from 'node:stream';

type Zip = yauzl.ZipFile;

const open = (fn: (cb: (err: Error | null, zip?: Zip) => void) => void) =>
  new Promise<Zip>((res, rej) => fn((err, zip) => (err || !zip ? rej(err ?? new Error('ZIP inválido')) : res(zip))));

export const openFile = (path: string) => open(cb => yauzl.open(path, { lazyEntries: true, autoClose: false }, cb));
export const openBuffer = (buf: Buffer) => open(cb => yauzl.fromBuffer(buf, { lazyEntries: true }, cb));

/** Recorre las entradas de un ZIP de a una. */
export async function* entries(zip: Zip): AsyncGenerator<yauzl.Entry> {
  const queue: (yauzl.Entry | null | Error)[] = [];
  let wake: (() => void) | null = null;
  zip.on('entry', (e: yauzl.Entry) => { queue.push(e); wake?.(); });
  zip.on('end', () => { queue.push(null); wake?.(); });
  zip.on('error', (e: Error) => { queue.push(e); wake?.(); });
  zip.readEntry();
  while (true) {
    if (!queue.length) await new Promise<void>(r => (wake = r));
    wake = null;
    const e = queue.shift()!;
    if (e === null) return;
    if (e instanceof Error) throw e;
    yield e;
    zip.readEntry();
  }
}

export const openStream = (zip: Zip, entry: yauzl.Entry) =>
  new Promise<Readable>((res, rej) => zip.openReadStream(entry, (err, s) => (err || !s ? rej(err) : res(s))));

export async function readAll(zip: Zip, entry: yauzl.Entry): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of await openStream(zip, entry)) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}
