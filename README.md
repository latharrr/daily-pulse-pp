Daily Pulse is a role-based (Employee / Manager / Admin) daily check-in and task-tracking app, built with [Next.js](https://nextjs.org).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Production Setup

The app has no built-in mock data -- it always reads/writes through a Google Sheet via the Apps Script backend in [`google-apps-script/Code.gs`](./google-apps-script/Code.gs). `GOOGLE_SCRIPT_URL` and `GOOGLE_SCRIPT_TOKEN` (see `.env.example`) are required; the app throws on boot if `GOOGLE_SCRIPT_URL` is missing.

### Google Sheets backend setup

1. Create a new Google Sheet.
2. Go to **Extensions > Apps Script**, delete the boilerplate, and paste the contents of [`google-apps-script/Code.gs`](./google-apps-script/Code.gs).
3. Run `setupSheets()` once from the Apps Script editor. Authorize when prompted.
   - This creates all subsheets (Users, Teams, Tasks, Checkins, Checkouts, ActivityLog, AuditLog, Config) with headers and formatting.
   - It seeds one admin account (`admin` / `admin123`) -- change that password immediately after first login.
4. Set the `API_TOKEN` script property:
   - **File > Project properties > Script properties** and add a property named `API_TOKEN` with a strong secret.
   - Or run `setApiToken('your-secret-here')` once in the editor.
5. **Deploy > New deployment > Web app**:
   - Execute as: Me
   - Who has access: Anyone
6. Copy the deployment URL into `GOOGLE_SCRIPT_URL` in your Next.js env.
7. Copy the same `API_TOKEN` value into `GOOGLE_SCRIPT_TOKEN` in your Next.js env.

`SESSION_SECRET` is required whenever `NODE_ENV=production` -- the app throws on boot if it's missing. Generate one with `openssl rand -base64 32`.

Passwords are hashed with bcrypt before they're ever sent to either backend; the Apps Script store only ever holds a hash, never plaintext.

The backend now enforces:

- API-token authentication on every request.
- Input validation for required fields and enums (role, priority, task status).
- Script-locking around writes to prevent race conditions.
- Soft delete with restore for Users, Teams, and Tasks.
- Pagination (`limit`, `offset`) and sorting on list endpoints.
- Idempotency keys for checkin/checkout submissions.
- A separate `AuditLog` sheet for security events.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
