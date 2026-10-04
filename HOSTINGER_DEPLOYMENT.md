# Deploying TimeMate to Hostinger via GitHub

This project is fully prepared for Hostinger deployment. Because TimeMate is a high-performance React + Vite Single Page Application (SPA), the production build lives in the `dist/` directory.

We have configured:
- **`public/.htaccess`**: Automatic Apache/LiteSpeed URL rewrites so refreshing any page or route on Hostinger works seamlessly without 404 errors.
- **`.github/workflows/deploy.yml`**: Automated continuous deployment via GitHub Actions.

---

## Method 1: Automated CI/CD Deployment with GitHub Actions (Recommended)

Every time you run `git push origin main`, GitHub will automatically build your app and deploy it straight to your Hostinger `public_html/` folder.

### Step 1: Get your FTP credentials from Hostinger
1. Log in to **Hostinger hPanel**.
2. Go to **Websites** -> click **Manage** next to your domain.
3. In the search bar or sidebar, search for **FTP Accounts**.
4. Note your:
   - **FTP Host / IP** (e.g. `ftp.yourdomain.com` or `185.xxx.xxx.xxx`)
   - **FTP Username**
   - **FTP Password** (or reset it if you don't remember)
   - **Port**: `21`

### Step 2: Add Secrets to your GitHub Repository
1. Open your repository on **GitHub.com**.
2. Go to **Settings** -> **Secrets and variables** -> **Actions**.
3. Click **New repository secret** and add the following 3 secrets:

| Secret Name | Value |
| :--- | :--- |
| `HOSTINGER_FTP_SERVER` | Your Hostinger FTP Host (e.g. `ftp.yourdomain.com` or IP) |
| `HOSTINGER_FTP_USERNAME` | Your Hostinger FTP Username |
| `HOSTINGER_FTP_PASSWORD` | Your Hostinger FTP Password |

*(Optional)* If you want to override the Supabase URL or publishable key, you can also add:
- `VITE_SUPABASE_URL`: `https://nnuuiektlsouuswxxnod.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `sb_publishable_nRtsqgxN_1JmR2jFYFPKdA_GL2uIEJx`

### Step 3: Push to GitHub to Deploy
Once your secrets are added, push your code:
```bash
git add .
git commit -m "Configure Hostinger deployment"
git push origin main
```
Go to the **Actions** tab on your GitHub repository. You will see the **Deploy TimeMate to Hostinger** workflow run, build the assets, and deploy the website. Within ~60 seconds, your site is live!

---

## Method 2: Manual Upload via Hostinger File Manager

If you prefer building locally and uploading:

1. In your local terminal, run:
   ```bash
   npm run build
   ```
2. This creates an optimized production folder called `dist/`.
3. Open **Hostinger hPanel** -> **File Manager** -> go to `public_html`.
4. Upload all files and folders **from inside** the `dist/` directory into `public_html` (including `index.html`, `assets/`, and `.htaccess`).

---

## Method 3: Using Hostinger Git in hPanel

1. In Hostinger hPanel, search for **Git**.
2. Paste your GitHub repository URL: `https://github.com/your-username/timemate.git`.
3. Set Branch to `main`.
4. Set Directory to `public_html`.
5. If using this method, ensure your build files are deployed or build via Hostinger SSH terminal:
   ```bash
   npm install && npm run build
   cp -r dist/* public_html/
   ```

---

## Verification Checklist

- [x] **SPA Routing**: `.htaccess` is present in `public/` and copies to `dist/.htaccess` during build.
- [x] **Supabase Connectivity**: Pre-configured with live Supabase project `nnuuiektlsouuswxxnod`.
- [x] **Responsive Mobile UI**: Optimized for all phone and desktop screen sizes.
- [x] **Zero Mock Data**: Real database queries for companions, bookings, and messaging.
