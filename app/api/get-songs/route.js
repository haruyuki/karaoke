import { NextResponse } from 'next/server';

function parseCSV(text) {
  // RFC4180-ish lightweight parser supporting quoted fields and newlines
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // handle CRLF and LF
      if (cur !== '' || row.length > 0) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      }
      // skip potential \n after \r
      if (ch === '\r' && text[i + 1] === '\n') i++;
      continue;
    }
    cur += ch;
  }
  // push last
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  // normalize trimming
  return rows.map(r => r.map(cell => (cell || '').trim()));
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sheetUrl = url.searchParams.get('sheetUrl');
    if (!sheetUrl) {
      return NextResponse.json({ error: 'Missing sheetUrl parameter' }, { status: 400 });
    }
    // Accept docs.google.com spreadsheet URLs and published CSVs on google.com
    let fetchUrl = sheetUrl;
    try {
      const parsed = new URL(sheetUrl);
      if (parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'sheetUrl must use https' }, { status: 400 });
      }
      // docs.google.com/spreadsheets/d/{id} -> export CSV
      if (parsed.hostname === 'docs.google.com' && parsed.pathname.startsWith('/spreadsheets/d/')) {
        const m = parsed.pathname.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!m) {
          return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
        }
        const id = m[1];
        const gid = parsed.searchParams.get('gid');
        fetchUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? '&gid=' + encodeURIComponent(gid) : ''}`;
      } else if (parsed.hostname === 'google.com' || parsed.hostname.endsWith('.google.com')) {
        // allow direct google.com published CSVs
        fetchUrl = sheetUrl;
      } else {
        return NextResponse.json({ error: 'sheetUrl must be a Google Sheets URL (docs.google.com/spreadsheets/d/...) or a published Google CSV' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid sheetUrl' }, { status: 400 });
    }
    let res;
    try {
      res = await fetch(fetchUrl, { method: 'GET' });
    } catch (e) {
      return NextResponse.json({ error: 'Failed to fetch sheet: ' + String(e) }, { status: 500 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 500 });
    }
    const text = await res.text();
    const rows = parseCSV(text);
    const out = {};
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // row 1 in sheet is header row: ID, Song Name, Link
      if (i === 0) continue;
      // skip empty rows
      if (r.length === 1 && r[0] === '') continue;
      if (r.length !== 3) {
        return NextResponse.json({ error: 'CSV must contain exactly 3 columns per row' }, { status: 400 });
      }
      const [idRaw, nameRaw, urlRaw] = r;
      const id = String(idRaw).trim();
      const name = String(nameRaw).trim();
      const link = String(urlRaw).trim();
      if (!id) continue;
      out[id] = { name, url: link };
    }
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: 'Server error: ' + String(e) }, { status: 500 });
  }
}
