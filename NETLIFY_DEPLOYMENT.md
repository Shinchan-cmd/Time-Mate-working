# Deploying TimeMate to Netlify using GitHub

This repository is pre-configured for instant **1-Click Netlify Deployment**.

We have added:
- **`netlify.toml`**: Netlify automatically reads this file to set the build command (`npm run build`), output folder (`dist`), SPA 200 rewrite rules, and caching headers.
- **`public/_redirects`**: Fallback redirect rule (`/* /index.html 200`) so all client-side routes and page refreshes work without 404 errors.

---

## 🚀 3-Step Deployment Guide

### Step 1: Push your code to GitHub
Make sure your latest code is committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "Configure Netlify deployment"
git push origin main
```

### Step 2: Connect GitHub to Netlify
1. Go to [Netlify.com](https://app.netlify.com) and log in.
2. In your Netlify dashboard, click **Add new site** &rarr; **Import an existing project**.
3. Select **GitHub** as your Git provider and authorize Netlify.
4. Select your **timemate** repository.

### Step 3: Verify Build Settings & Deploy
Because `netlify.toml` is included in the project, Netlify will **automatically fill in all the correct build settings**:
- **Branch to deploy**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `dist`

#### Environment Variables (Optional):
Under **Site configuration** &rarr; **Environment variables**, you can verify or set:
- `VITE_SUPABASE_URL`: `https://nnuuiektlsouuswxxnod.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `sb_publishable_nRtsqgxN_1JmR2jFYFPKdA_GL2uIEJx`

*(Note: These defaults are already embedded in `netlify.toml` and the code fallback).*

Click **Deploy TimeMate**. Netlify will build your site and give you a live production URL (e.g. `https://timemate-xxx.netlify.app`) in ~45 seconds!

---

## 🔄 Automatic Continuous Deployment (CI/CD)
From this point forward:
- Any `git push` to your `main` branch will automatically trigger Netlify to build and update your live site.
- Pull requests will automatically generate instant **Deploy Previews** for testing before merging.

---

## 🌐 Custom Domain (Optional)
To use your custom domain (e.g., `timemate.in` or `timemate.com`):
1. In Netlify, go to **Site configuration** &rarr; **Domain management**.
2. Click **Add a domain** and type your domain name.
3. Follow the DNS instructions to point your domain (or use Netlify DNS).
4. Netlify will automatically provision a free **Let's Encrypt SSL certificate** with automatic HTTPS.
