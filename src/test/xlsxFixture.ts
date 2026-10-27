import { deflateRawSync } from 'node:zlib';

// Builds a small .xlsx file the way Google Sheets downloads one: typed text
// in the shared string list, and formula cells (Region, Check) as formula
// plus last value. Synthetic data only.

export interface FixtureCell {
  value: string;
  formula?: string;
}
export type FixtureSheet = (string | FixtureCell)[][];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i: number): string => (i >= 26 ? colName(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

const zip = (files: Record<string, string>): Buffer => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.from(text, 'utf8');
    const data = deflateRawSync(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
};

export const buildXlsx = (sheets: Record<string, FixtureSheet>): Buffer => {
  const shared: string[] = [];
  const sharedIndex = (s: string) => {
    const i = shared.indexOf(s);
    return i >= 0 ? i : shared.push(s) - 1;
  };
  const files: Record<string, string> = {};
  const names = Object.keys(sheets);
  names.forEach((name, n) => {
    const rows = sheets[name]
      .map((cells, r) => {
        const cs = cells
          .map((cell, c) => {
            const ref = `${colName(c)}${r + 1}`;
            if (typeof cell === 'string') return cell === '' ? '' : `<c r="${ref}" s="1" t="s"><v>${sharedIndex(cell)}</v></c>`;
            return `<c r="${ref}" s="2" t="str"><f>${esc(cell.formula ?? '')}</f><v>${esc(cell.value)}</v></c>`;
          })
          .join('');
        return `<row r="${r + 1}">${cs}</row>`;
      })
      .join('');
    files[`xl/worksheets/sheet${n + 1}.xml`] =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
  });
  files['xl/workbook.xml'] =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
    names.map((name, n) => `<sheet name="${esc(name)}" sheetId="${n + 1}" r:id="rId${n + 1}"/>`).join('') +
    `</sheets></workbook>`;
  files['xl/_rels/workbook.xml.rels'] =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    names.map((_, n) => `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n + 1}.xml"/>`).join('') +
    `</Relationships>`;
  files['xl/sharedStrings.xml'] =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">` +
    shared.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('') +
    `</sst>`;
  return zip(files);
};
