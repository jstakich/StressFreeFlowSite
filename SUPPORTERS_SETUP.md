# Supporter names (automatic)

Names show on the page immediately after someone taps **Send support**. There is no dislike button and no approval step.

## One-time setup (about 5 minutes)

This uses a free Vercel API so names save for everyone on the site.

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. **Add New Project** → import `StressFreeFlowSite`
3. Deploy (defaults are fine)
4. In Vercel → **Settings → Environment Variables**, add:
   - `GITHUB_TOKEN` = a GitHub personal access token with **Contents: Read and write** on `StressFreeFlowSite`
   - `SUPPORTER_SUBMIT_SECRET` = `sff-7k2m9xq4p` (same as in `likes-config.js`)
5. Redeploy once after adding the variables
6. Copy your Vercel URL (example: `https://stressfreeflow.vercel.app`) into `likes-config.js`:

```javascript
apiUrl: "https://YOUR-VERCEL-URL.vercel.app/api/add-supporter",
```

7. Commit and push `likes-config.js`

After that, every new name is saved automatically and appears for all visitors.

## Notes

- One support per browser (no duplicate taps from the same phone/computer)
- First names only
- No dislikes — support only
