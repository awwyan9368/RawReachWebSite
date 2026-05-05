# Raw Reach Website

A single-folder, Vercel-ready website for Raw Reach Agency. It includes the animated frontend, your logo, roofing hero assets, WhatsApp chat popup, contact form, Vercel API routes, local development server, and an admin page for viewing leads.

## Folder Contents

- `index.html` - main animated website
- `styles.css` - black/gold premium styling and responsive layout
- `script.js` - scroll reveals, stat counters, mobile menu, contact form, WhatsApp popup
- `admin.html` and `admin.js` - private leads viewer protected by admin token
- `api/contact.js` - contact form API route
- `api/submissions.js` - protected lead listing and CSV export API route
- `api/_lib/storage.js` - validation, rate limiting, Upstash/local storage helpers
- `server.js` - no-dependency local server for previewing the site
- `assets/rawreachlogo.png` - provided Raw Reach logo
- `assets/roofing-hero.webp` and `assets/roofing-hero-small.webp` - optimized website hero images
- `assets/roofing-hero.png` - original generated roofing image copy
- `data/submissions.json` - local-only lead storage fallback

## Run Locally

```bash
cd RawReach-Website
node server.js
```

Open `http://localhost:3000`.

Local contact form submissions are stored in `data/submissions.json`. To use the admin page locally, create a `.env.local` file:

```bash
RAWREACH_ADMIN_TOKEN=choose-a-private-token
```

Then open `http://localhost:3000/admin.html`.

## Deploy on Vercel

This project is dependency-free and works as static files plus Vercel serverless functions.

1. Upload or import the `RawReach-Website` folder into Vercel.
2. Create an Upstash Redis database.
3. Add these Vercel environment variables:

```bash
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
RAWREACH_ADMIN_TOKEN=choose-a-long-private-token
RAWREACH_ALLOWED_ORIGIN=https://your-vercel-domain.vercel.app
```

The contact API intentionally returns a storage configuration error on Vercel if Upstash is missing, so real leads are not silently lost.

## Access Leads

- Visit `/admin.html`
- Enter the same value you set for `RAWREACH_ADMIN_TOKEN`
- Use `Load Leads` to view inquiries
- Use `Export CSV` to download submissions

The backend stores the newest leads first and keeps the latest 5,000 records by default.

## Editing Content

- Replace review placeholders inside the `#reviews` section of `index.html`.
- Replace testimonial placeholders inside the `#testimonials` section.
- The WhatsApp popup link is in `index.html` and currently routes to the requested WhatsApp chat portal without displaying the phone number on the page.
- Careers currently link to `https://forms.gle/RyJhz7YNcD7W5kkk8`.

## Sources Used

- Advertizo site structure inspiration: https://theadvertizo.com/
- Roofing contractor market size, last updated March 2026: https://www.ibisworld.com/united-states/market-size/roofing-contractors/198/
- Roofing contractor business count, last updated March 2026: https://www.ibisworld.com/united-states/number-of-businesses/roofing-contractors/198/
- Roofing contractor employment, last updated March 2026: https://www.ibisworld.com/united-states/employment/roofing-contractors/198/
- Raw Reach hiring description: Google Drive PDF provided in the request

## Generated Image

The roofing background was generated with the built-in image generation tool as a photorealistic, no-human, roofing-related hero asset for a black/gold agency website, then optimized into WebP files for the website.
