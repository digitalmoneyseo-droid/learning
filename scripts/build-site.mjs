#!/usr/bin/env node
/* ============================================================
   Landing-Page-Generator für die Learning-Site
   Scannt Hauptfach-/Thema-Ordner und schreibt /index.html neu.
   Null Abhängigkeiten – läuft mit jeder aktuellen Node-Version.
   Aufruf:  node scripts/build-site.mjs
   ============================================================ */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['scripts', 'node_modules']);
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: '\u00A0', thinsp: '\u2009', middot: '\u00B7',
  ndash: '\u2013', mdash: '\u2014', hellip: '\u2026',
  rsquo: '\u2019', lsquo: '\u2018',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/** Kind-Ordner eines Verzeichnisses, alphabetisch, ohne Junk */
function dirsOf(absPath) {
  return readdirSync(absPath, { withFileTypes: true })
    .filter((e) => e.isDirectory()
      && !e.name.startsWith('.')
      && !SKIP_DIRS.has(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'de'));
}

const ACRONYMS = new Set(['oop', 'html', 'css', 'js', 'sql']);
const slugLabel = (slug) => slug.split('-')
  .map((w) => ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ');

/** <title> aus einer HTML-Datei lesen (erste 2 KB genügen) */
function htmlTitle(absPath, fallback) {
  try {
    const m = readFileSync(absPath, 'utf8').slice(0, 2000).match(/<title>([\s\S]*?)<\/title>/i);
    if (!m) return fallback;
    return decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
  } catch { return fallback; }
}

/** Ersten Absatz unter "## Why" aus einer MISSION.md holen */
function missionWhy(topicAbs) {
  const p = join(topicAbs, 'MISSION.md');
  if (!existsSync(p)) return '';
  try {
    const m = readFileSync(p, 'utf8').match(/^##\s*Why\s*?\n([\s\S]*?)(?=\n##\s|\s*$)/m);
    if (!m) return '';
    let t = m[1].replace(/\s+/g, ' ').trim();
    if (t.length > 260) t = t.slice(0, 260).replace(/\s+\S*$/, '') + ' …';
    return t;
  } catch { return ''; }
}

/** "Lektion 1 · Titel" → { badge, name }; ohne Punkt → { badge:'', name:alles } */
function splitBadge(title) {
  const parts = title.split('\u00B7');
  return parts.length >= 2
    ? { badge: parts[0].trim(), name: parts.slice(1).join(' \u00B7 ').trim() }
    : { badge: '', name: title };
}

/* ---------- Struktur einlesen ---------- */

const site = [];
for (const subject of dirsOf(ROOT)) {
  const subjectAbs = join(ROOT, subject);
  const topics = dirsOf(subjectAbs).map((topic) => {
    const topicAbs = join(subjectAbs, topic);
    const lessonsDir = join(topicAbs, 'lessons');
    const refDir = join(topicAbs, 'reference');

    const lessons = existsSync(lessonsDir)
      ? readdirSync(lessonsDir).filter((f) => f.endsWith('.html'))
          .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
          .map((f) => ({
            file: f,
            ...splitBadge(htmlTitle(join(lessonsDir, f), f.replace(/\.html$/, ''))),
          }))
      : [];

    const reference = existsSync(refDir)
      ? readdirSync(refDir).filter((f) => f.endsWith('.html'))
          .map((f) => ({
            file: f,
            name: splitBadge(htmlTitle(join(refDir, f), f.replace(/\.html$/, ''))).name,
          }))
      : [];

    return {
      slug: topic,
      label: slugLabel(topic),
      why: missionWhy(topicAbs),
      lessons,
      reference,
      hasNotes: existsSync(join(topicAbs, 'NOTES.md')),
      hasResources: existsSync(join(topicAbs, 'RESOURCES.md')),
    };
  }).filter((t) => t.lessons.length || t.reference.length);

  if (topics.length) site.push({ slug: subject, label: slugLabel(subject), topics });
}

if (!site.length) {
  console.error('Keine Themen gefunden – gibt es wirklich nichts zu veröffentlichen?');
  process.exit(1);
}

/* ---------- HTML erzeugen ---------- */

const lessonItem = (subject, topic, l) =>
  `<li>${l.badge ? `<span class="badge">${esc(l.badge)}</span>` : ''}` +
  `<a href="${esc(`${subject}/${topic}/lessons/${l.file}`)}">${esc(l.name)}</a></li>`;

const topicCard = (s, t) => {
  const firstHref = t.lessons.length
    ? `${s.slug}/${t.slug}/lessons/${t.lessons[0].file}`
    : `${s.slug}/${t.slug}/reference/${t.reference[0].file}`;
  return `
  <section class="card">
    <h3><a class="card-title" href="${esc(firstHref)}">${esc(t.label)}</a></h3>
    ${t.why ? `<p class="why">${esc(t.why)}</p>` : ''}
    ${t.lessons.length
      ? `\n      <ol class="lessons">\n        ${t.lessons.map((l) => lessonItem(s.slug, t.slug, l)).join('\n        ')}\n      </ol>`
      : ''}
    ${t.reference.length
      ? `\n      <p class="ref-row"><span class="ref-label">Nachschlagen</span>${t.reference.map((r) =>
          `<a href="${esc(`${s.slug}/${t.slug}/reference/${r.file}`)}">${esc(r.name)}</a>`).join('')}</p>`
      : ''}
    <p class="meta-row"><span class="meta-count">${t.lessons.length} Lektion${t.lessons.length === 1 ? '' : 'en'}</span>
      ${t.hasResources ? `<a href="${esc(`${s.slug}/${t.slug}/RESOURCES.md`)}">Ressourcen</a>` : ''}
      ${t.hasNotes ? `<a href="${esc(`${s.slug}/${t.slug}/NOTES.md`)}">Notizen</a>` : ''}
    </p>
  </section>`;
};

const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lernpfade</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
<style>
  :root{--paper:#faf7f0;--ink:#22211e;--ink-soft:#55524a;--accent:#8c3b2e;
        --accent-dark:#6e2e24;--line:#d9d2c4;--card:#fffdf8;
        --serif:Georgia,'Iowan Old Style','Palatino Linotype',Palatino,'Times New Roman',serif;
        --sans:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
  *{box-sizing:border-box}
  body{margin:0;padding:3rem 1.25rem 5rem;background:var(--paper);color:var(--ink);
       font-family:var(--serif);font-size:17px;line-height:1.65}
  main,footer{max-width:66rem;margin-left:auto;margin-right:auto}
  .kicker{font-family:var(--sans);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;
          color:var(--accent);margin-bottom:.4rem}
  h1{font-size:2rem;line-height:1.2;margin:0 0 1.2rem;font-weight:700}
  .intro{max-width:44rem;color:var(--ink-soft)}
  h2.subject{font-size:1.3rem;margin:3rem 0 1rem;padding-top:.6rem;border-top:2px solid var(--ink)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(19rem,1fr));gap:1.1rem}
  .card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:1.15rem 1.3rem}
  h3{margin:0;font-size:1.08rem}
  .card-title{text-decoration:none;color:var(--ink)}
  .card-title:hover{color:var(--accent-dark)}
  .why{color:var(--ink-soft);font-size:.93rem;margin:.45rem 0 .8rem}
  ol.lessons{list-style:none;margin:.2rem 0 .6rem;padding:0}
  ol.lessons li{padding:.32rem 0;border-bottom:1px dotted var(--line);
                display:flex;align-items:baseline;gap:.55rem}
  ol.lessons li:last-child{border-bottom:none}
  ol.lessons a{color:var(--accent-dark);text-decoration-thickness:1px;text-underline-offset:2px}
  ol.lessons a:hover{color:var(--accent)}
  .badge{font-family:var(--sans);font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;
         color:var(--ink-soft);white-space:nowrap}
  .ref-row,.meta-row{font-family:var(--sans);font-size:.78rem;color:var(--ink-soft);margin:.7rem 0 0}
  .ref-row a,.meta-row a{color:var(--accent-dark);margin-left:.35rem}
  .ref-label{letter-spacing:.08em;text-transform:uppercase;font-size:.7rem}
  .meta-count{background:var(--paper);border:1px solid var(--line);border-radius:99px;padding:.05rem .6rem}
  @media print{body{background:#fff;padding:0}}
</style>
</head>
<body>
<main>
  <p class="kicker">Selbstorganisiertes Lernen</p>
  <h1>Lernpfade</h1>
  <p class="intro">Kurze, in sich abgeschlossene Lektionen mit Quiz zum Sofort-Feedback –
     entstanden als persönlicher Kursbegleiter und öffentlich dokumentiert.</p>

${site.map((s) => `  <h2 class="subject">${esc(s.label)}</h2>
  <div class="grid">
${s.topics.map((t) => topicCard(s, t).trim()).join('\n')}
  </div>`).join('\n')}
</main>
<footer>Automatisch generiert am ${dateStr} durch <code>scripts/build-site.mjs</code>.</footer>
</body>
</html>
`;

writeFileSync(join(ROOT, 'index.html'), html, 'utf8');
writeFileSync(join(ROOT, '.nojekyll'), '', 'utf8');

const nTopics = site.reduce((n, s) => n + s.topics.length, 0);
const nLessons = site.reduce((n, s) => n + s.topics.reduce((m, t) => m + t.lessons.length, 0), 0);
console.log(`index.html geschrieben: ${site.length} Fachbereiche, ${nTopics} Themen, ${nLessons} Lektionen.`);
