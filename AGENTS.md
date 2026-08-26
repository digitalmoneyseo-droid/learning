# Learning Workspace

This folder is a learning workspace. Every topic gets its own folder:

```
learning/
  mathematik/
    integralrechnung/     <- one folder per topic, ALL files for it live here
      MISSION.md
      lessons/
      reference/
      learning-records/
      assets/
      RESOURCES.md
      NOTES.md
  physik/
    mechanik/
```

## Conventions

- Subject folders: lowercase category in the learner's language (`mathematik`, `physik`, `programmierung`, `sprachen`, ...). Create if no existing folder covers the topic; reuse an existing one when it does.
- Topic folders: lowercase slug of the topic (`integralrechnung`, `lineare-algebra`).
- Never place lesson or state files directly in a subject folder or the workspace root.
- When asked to learn/teach something ("bringe mir X bei", "teach me X"), use the `learn` skill to route into the right folder, then follow the `teach` skill workflow inside that folder.
- If the topic folder already exists, treat the request as a continuation: read `MISSION.md`, `NOTES.md`, and `learning-records/` before teaching.

## Website & GitHub Pages

- The repo publishes a public site via GitHub Pages: `.github/workflows/deploy.yml` runs on every push to `main`.
- `scripts/build-site.mjs` generates the root `index.html` (landing page) by scanning subject/topic folders. Never hand-edit `index.html`; change the builder instead.
- After adding, renaming, or removing lessons/topics locally, either run `node scripts/build-site.mjs` yourself or just push – CI regenerates it automatically.
- Every top-level folder except `scripts` and dot-folders is treated as a subject on the site; subjects/topics should contain at least one HTML file in `lessons/` or `reference/` to appear.
- Lesson/reference HTML must stay self-contained with relative asset links (`../assets/...`) – they are served both via `file://` offline and through GitHub Pages.
