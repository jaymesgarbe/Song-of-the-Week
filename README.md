# Song of the Week

Static Astro site on Cloudflare Pages, with a comments API (Pages Functions + D1 + Turnstile).

```
src/content/weeks/NNN.md    one file per week (the data)
src/content.config.ts       schema for week files
src/lib/weeks.ts            sorting, stats, helpers
src/pages/                  index (latest week), week/[week], archive, admin, 404
src/components/             SongEntry, WeekList, Comments
functions/api/comments.ts          GET/POST public comments
functions/api/admin/comments.ts    GET/PATCH, protected by Cloudflare Access
migrations/                 D1 schema
scripts/new-week.mjs        scaffolds the next week's file
```

## Publishing a new week

```powershell
npm run new-week        # creates src/content/weeks/088.md as a draft
# fill it in, drop cover art in public/covers/, remove `draft: true`
git add -A; git commit -m "Week 88"; git push
```

Pushing triggers a Cloudflare Pages rebuild. The homepage always shows the highest
published week number; everything else is in the archive. Stats are computed at build time.

Only `week`, `title`, `artist`, `score` are required. Weeks 1–87 have `legacy: true`:
they appear in the archive with a Legacy label but get no page and aren't clickable.
New weeks never need that field. `artist` can be a list for
collaborations: `artist: ["Molly Lewis", "Thee Sacred Souls"]`.
`favorite` is a plain sentence (`favorite: "The bridge"`), or `{ note, timestamp }` if you
want to point at a moment. Paste share links into `links` exactly as copied from the app.
`links.spotify` becomes an embedded player near the top of the entry (a link that isn't a
Spotify track/album/playlist fails the build with a message naming the field).
`links.youtube`, `links.apple` and `links.bandcamp` show as icon links that open in a new tab.

Your byline (name, optional photo and link) is set in `src/lib/site.ts`.

## Local development

```powershell
npm install
Copy-Item .env.example .env              # Turnstile test site key
Copy-Item .dev.vars.example .dev.vars    # Turnstile test secret, local admin bypass
npm run db:migrate:local

npm run dev       # fast page editing; the comments API does NOT run here
npm run preview   # full site + comments API + local D1 at http://localhost:8788
```

Admin page locally: http://localhost:8788/admin (allowed by `DEV_ADMIN_BYPASS`, localhost only).

## First deploy

1. **Repo**: push this project to GitHub.
2. **D1**: `npx wrangler d1 create sotw-comments`, paste the `database_id` into `wrangler.toml`,
   then `npm run db:migrate:remote`.
3. **Pages**: Cloudflare dashboard > Workers & Pages > Create > Pages > connect the repo.
   Build command `npm run build`, output `dist`. Wrangler.toml supplies the D1 binding.
4. **Turnstile**: Cloudflare dashboard > Turnstile > add widget for `jaymesgarbe.com`.
   - Site key: Pages project > Settings > Environment variables > `PUBLIC_TURNSTILE_SITE_KEY`
     (build-time variable, so redeploy after setting it).
   - Secret: `npx wrangler pages secret put TURNSTILE_SECRET`
5. **IP salt**: `npx wrangler pages secret put IP_SALT` with a long random string.
   Changing it later resets rate-limit history, nothing else.
6. **Domain**: add `jaymesgarbe.com` as a site in Cloudflare, then change the nameservers at
   Squarespace Domains to the two Cloudflare gives you. The domain stays registered at
   Squarespace. Copy over any existing records you rely on (e.g. email MX) first.
   Then Pages project > Custom domains > add `jaymesgarbe.com` and `www.jaymesgarbe.com`.
7. **Admin access**: Zero Trust > Access > Applications > Self-hosted. Cover
   `jaymesgarbe.com/admin` and `jaymesgarbe.com/api/admin/*`, policy = your email.
   Put your team domain and the application's AUD tag in `wrangler.toml` `[vars]`.
   The admin API also verifies the Access JWT itself, so it stays locked if the policy is removed.

## Comments

- Only the current (highest) week accepts comments. Once a new week is published, older
  weeks show their comments read-only. The API enforces this too, by reading the built
  `/current-week.json`.
- Live immediately. Guards: Turnstile, 3 posts per hashed IP per 10 min, length caps, links rejected.
- `private_name` is optional and only returned by the admin API.
- Raw IPs are never stored, only `SHA-256(IP_SALT + ip)`.
- Hide/unhide from `/admin` (soft delete).
- Tune limits in `LIMITS` at the top of `functions/api/comments.ts`.

## Styling

All visual decisions are CSS custom properties at the top of `src/layouts/Base.astro`
(colors, fonts, measure, spacing). Component styles only reference those tokens.
