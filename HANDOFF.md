# NTSA Project — Handoff Notes

Read this first if you're picking up work on this project on a different machine. It covers what's been built, what's deployed, and gotchas specific to this project's setup.

## What this project is

NTSA is an e-commerce app: a Flutter customer app (Android, also has a wholesale-buyer portal built into the same app), a React (Vite) admin/vendor web panel, and a Node/Express/Prisma/PostgreSQL backend. Brand colors: navy `#13224A`, orange `#F5841F`. Tagline: "Shop Smarter, Live Better."

## Repo & deployment status

- **GitHub**: `https://github.com/chaturbhuj9166/E-Commerce-App-New.git`, branch `main`. Currently **public** — consider making it private since it's a client project.
- **Render — Backend** (web service): `https://e-commerce-app-new-gmgz.onrender.com`
  - Build command: `npm install && npx prisma generate && npx prisma db push && node prisma/seed.js`
  - Start command: `npm start`
  - Root directory: `Backend`
- **Render — Admin panel** (static site): `https://e-commerce-app-new-1.onrender.com`
  - Build command: `npm install && npm run build`
  - Publish directory: `dist`
  - Root directory: `Frontend/web`
- **Render — Postgres**: free tier, **expires 2026-10-19** unless upgraded. Region: Virginia (US East) — keep any new Render service in the same region if it needs the *internal* database URL.

Both Render services auto-deploy on every push to `main`.

## Environment variables

Real values live in `Backend/.env` (gitignored — never committed). If you're on a new machine, copy that file over manually (USB, not chat/email). Required keys: `DATABASE_URL`, `JWT_SECRET`, `DEMO_MODE`, `NODE_ENV`, `CORS_ORIGIN`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. `Backend/.env.example` has the full list with blanks.

On Render, these are set separately per-service in each service's Environment tab (Render never reads the repo's `.env`).

`DEMO_MODE=true` + `NODE_ENV=development` are intentional — this app has no real Firebase phone-OTP login or real Razorpay payments wired in yet (see "What's NOT done" below). Setting `NODE_ENV=production` while `DEMO_MODE=true` makes the backend refuse to start (`Backend/src/config.js`), by design.

## Important gotchas learned the hard way

1. **Render Static Site "Redirects/Rewrites" do NOT reliably proxy POST request bodies to an external destination.** We initially tried routing the admin panel's `/api/*` calls through a Rewrite rule to the backend — logins silently failed (POST arrived at the backend as something that didn't match the login route, backend's `auth` middleware then threw `"Please sign in again"`). The actual fix: `Frontend/web/src/api.js` now reads `import.meta.env.VITE_API_URL` (falls back to relative `/api` for local dev, where Vite's own dev-server proxy handles it) and calls the backend's real URL directly, with CORS configured on the backend (`CORS_ORIGIN` = the admin panel's exact origin). Don't re-introduce a static-site rewrite for API calls.

2. **This Windows laptop is memory-constrained (8GB RAM, often only 1–2GB free).** Flutter **release** APK builds (`flutter build apk --release`) reliably OOM-crash here — both the Dart AOT compiler and the Gradle daemon have crashed with "insufficient memory." Workarounds applied:
   - `Frontend/customer/android/gradle.properties`: lowered `org.gradle.jvmargs` from `-Xmx8G` (impossible on this machine) to `-Xmx1536m -XX:MaxMetaspaceSize=512m -XX:ReservedCodeCacheSize=128m`.
   - For sharing an APK with the client to test, a **debug** build (`flutter build apk --debug --dart-define=API_BASE_URL=...`) is what's actually been used — it's reliable here and fully functional, just larger and slightly slower, with a small debug banner.
   - Before any Android build on this machine, closing unnecessary Chrome tabs / VS Code windows first measurably helps.
   - `kotlin.incremental=false` is also set in `gradle.properties` — needed because the project lives on the `P:` drive while Gradle/pub caches live on `C:`/`D:`, and Kotlin's incremental compiler can't relativize paths across drive letters.

3. **The Flutter app's backend URL is a build-time flag, not a config file**: `Frontend/customer/lib/core/api_client.dart` defaults to `http://localhost:4000/api` and is overridden with `--dart-define=API_BASE_URL=https://e-commerce-app-new-gmgz.onrender.com/api` at build time. Any new APK build for real device testing (not `adb reverse` local testing) needs that flag.

4. **Local image storage is a dev-only stand-in.** `Backend/src/services/storage.js` falls back to saving uploads on local disk (serving them from `http://localhost:PORT/uploads/...`) only when Cloudinary env vars are absent. Cloudinary is now configured with the client's real account, so this fallback shouldn't trigger anymore — but if you ever see a product/user photo pointing at `localhost:4000/uploads/...`, it was uploaded before Cloudinary was wired in (or Cloudinary env vars are missing) and needs re-uploading.

## What's NOT done yet (needed before a real public launch, not needed for a client demo)

See `NTSA-APP-LAYOUT-IMG/NTSA-External-Services-Required.pdf` if that folder still exists (it went missing once mid-session — client's original approved design reference images may need re-requesting from the client if it's genuinely gone). Summary: real Firebase phone-OTP + Google/Apple login, real Razorpay payments. Everything else (Cloudinary, database, hosting) is done.

## Recently built features (this session)

- Admin-defined custom product attributes (free-form spec rows, e.g. "Capacity: 20L") — shown as "Specifications" on the product page.
- Wholesale portal rebuilt with its own bottom nav (Home/Categories/Messages/Settings), matching the retail app's banner slider and category browsing.
- Vendor ↔ Admin messaging (`VendorMessage` model, `/vendor/messages` + `/admin/vendors/:id/messages` endpoints, chat UI in the app and in the admin panel).
- An "AI Shopping Assistant" chat icon on the customer app — a keyword-search heuristic over the product catalog, not a real LLM (flagged as such in code comments), consistent with other stand-ins used here (no paid AI API key available).

## Local dev quick-start (if not just using the Render deployment)

```bash
npm install                    # root: installs Backend + Frontend/web workspaces
cd Frontend/customer && flutter pub get
```
Copy `Backend/.env` from another machine (gitignored, not in git), or fill `Backend/.env.example` with real values.
```bash
npm run dev:api      # Backend on :4000
npm run dev:web      # Admin panel on :5173 (or Vite's next free port)
cd Frontend/customer && flutter run   # or flutter run -d <device-id> for a physical phone
```
For a physical Android phone over USB (not an emulator): `adb reverse tcp:4000 tcp:4000` needs to stay active for the app to reach a locally-running backend — it drops periodically and needs re-running.
