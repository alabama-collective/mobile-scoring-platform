// Reads the tabs of an .xlsx file (Google Sheets: File, Download, Microsoft
// Excel) as rows of text. Small on purpose, so staff need no extra install.
// Formula cells give the value the sheet last worked out.
import { inflateRawSync } from 'node:zlib';

export type Workbook = Record<string, string[][]>;

// ---- The .xlsx file is a zip of XML files ---------------------------------

const unzip = (buf: Buffer): Map<string, Buffer> => {
  // The zip's table of contents is at the end, after a fixed marker.
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('not an .xlsx file');
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const files = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('not an .xlsx file');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, inflateRawSync(raw));
    else throw new Error('not an .xlsx file');
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
};

// ---- XML bits --------------------------------------------------------------

const decode = (s: string) =>
  s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) => {
    const named: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
    if (named[e.toLowerCase()]) return named[e.toLowerCase()];
    return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });

const attr = (attrs: string, name: string) => attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];

// All the <t> text inside a piece of XML, joined (rich text has several).
const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');

const column = (ref: string) => {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const readSheet = (xml: string, shared: string[]): string[][] => {
  const rows: string[][] = [];
  for (const row of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(attr(row[1], 'r') ?? rows.length + 1) - 1;
    const cells: string[] = [];
    for (const c of (row[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(c[1], 'r');
      const type = attr(c[1], 't');
      const body = c[2] ?? '';
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = '';
      if (type === 's') value = v === undefined ? '' : shared[Number(v)] ?? '';
      else if (type === 'inlineStr') value = texts(body);
      else if (type === 'b') value = v === '1' ? 'TRUE' : v === '0' ? 'FALSE' : '';
      else value = v === undefined ? '' : decode(v);
      cells[ref ? column(ref) : cells.length] = value;
    }
    rows[r] = Array.from(cells, (x) => x ?? '');
  }
  return Array.from(rows, (x) => x ?? []);
};

export const readXlsx = (buf: Buffer): Workbook => {
  const files = unzip(buf);
  const text = (name: string) => files.get(name)?.toString('utf8');
  const book = text('xl/workbook.xml');
  if (!book) throw new Error('not an .xlsx file');
  const shared = [...(text('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const targets = new Map<string, string>();
  for (const m of (text('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attr(m[1], 'Id');
    const target = attr(m[1], 'Target');
    if (id && target) targets.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }
  const workbook: Workbook = {};
  for (const m of book.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const name = decode(attr(m[1], 'name') ?? '');
    const path = targets.get(attr(m[1], 'r:id') ?? '');
    const xml = path ? text(path) : undefined;
    if (name && xml) workbook[name] = readSheet(xml, shared);
  }
  return workbook;
};
