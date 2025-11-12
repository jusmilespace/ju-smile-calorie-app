// src/csv.ts
export async function fetchCsv(url: string): Promise<Record<string, string>[]> {
  if (!url) return [];
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const text = await res.text();
  return parseCsv(text);
}

function parseCsv(text: string): Record<string, string>[] {
  // Simple CSV parser (commas, quotes), first row as header
  const rows: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"' && inQ && n === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (!inQ && (c === '\n' || c === '\r')) {
      if (cur.length || rows.length) { rows.push(cur); cur = ""; }
      if (c === '\r' && n === '\n') i++; // CRLF
      continue;
    }
    cur += c;
  }
  if (cur.length) rows.push(cur);

  const records: Record<string, string>[] = [];
  if (rows.length === 0) return records;

  const headers = splitRow(rows[0]);
  for (let i = 1; i < rows.length; i++) {
    const cols = splitRow(rows[i]);
    if (cols.length === 1 && cols[0].trim() === "") continue;
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = cols[j] ?? "";
    records.push(obj);
  }
  return records;
}

function splitRow(row: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    const n = row[i + 1];
    if (c === '"' && inQ && n === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (!inQ && c === ',') { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}
