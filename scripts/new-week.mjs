// Usage: npm run new-week
// Creates src/content/weeks/NNN.md for the next week number, as a draft.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'src', 'content', 'weeks');
const weeks = readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => Number(/^week:\s*(\d+)/m.exec(readFileSync(join(dir, f), 'utf8'))?.[1]))
  .filter(Number.isFinite);
const next = Math.max(0, ...weeks) + 1;
const file = join(dir, `${String(next).padStart(3, '0')}.md`);
const today = new Date().toISOString().slice(0, 10);

writeFileSync(
  file,
  `---
week: ${next}
title: ""
artist: ""
score: 0
date: ${today}
album: ""
# year: 2026
# cover: /covers/${String(next).padStart(3, '0')}.jpg
favorite:
  timestamp: "0:00"
  note: ""
  # youtubeId: ""
# links:
#   spotify: ""
#   apple: ""
#   youtube: ""
draft: true   # set to false (or delete this line) to publish
---

Review goes here.
`,
  { flag: 'wx' },
);
console.log(`Created ${file}`);
