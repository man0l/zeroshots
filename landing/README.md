## zeroshots.app landing

Simple Next.js landing page with a join list form wired to a backend API route.

### Local development

```bash
cd landing
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment variables

Create an `.env.local` file (not committed) and set:

```bash
MAILER_API_KEY=your-mailer-api-key-here
MAILER_API_ENDPOINT=https://your-mailer-service.example/subscribe
```

**Why doesn’t the email form work?** If `MAILER_API_KEY` or `MAILER_API_ENDPOINT` are missing, the join API returns 503 and the form shows “Signup is not available right now.” Copy from `.env.example` and add your mailer credentials (e.g. MailerLite, Resend, or any HTTP API that accepts POST with email).

On Vercel, set the same variables in the project settings. The API key never appears in the client bundle; it is only read inside the `/api/join` server route.

### Deploying to Vercel

1. Point a new Vercel project at the `landing` directory.
2. Framework preset: **Next.js**.
3. Add the environment variables above in Vercel.
4. Deploy.

