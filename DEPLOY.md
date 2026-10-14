# Deployment Guide

## 1. Push to GitHub

1. Initialize git if you haven't already:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Create a new repository on GitHub.
3. Push your code:
   ```bash
   git remote add origin https://github.com/ArmaestroDev/Finanz-Manager.git
   git push -u origin main
   ```
   > **Note**: Your `.pem` file is strictly ignored by `.gitignore` and will NOT be uploaded. This is correct.

## 2. Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and "Add New > Project".
2. Import your GitHub repository.
3. Vercel should detect "Expo" or "Create React App".
4. **Environment Variables**: You MUST add the following variables in the Vercel Project Settings before deploying (or during the import step):

   | Variable Name | Value | Description |
   |---|---|---|
   | `ENABLE_BANKING_APP_ID` | `3325a771-fed9-4e4a-b6c6-f41a1194c853` | Your App ID |
   | `ENABLE_BANKING_PRIVATE_KEY` | _(Content of your .pem file)_ | Open your `.pem` file via notepad, copy ALL the text (including BEGIN/END headers) and paste it here. |
   | `REDIRECT_URL` | `https://your-project-name.vercel.app` | The URL provided by Vercel (you might need to deploy once to get this, or guess it). Defaults to localhost if missing. |
   | `ALLOWED_ORIGINS` | _(optional)_ `https://my-domain.de` | Extra web origins allowed to call `/api` (comma-separated). The origin of `REDIRECT_URL` is always allowed; other websites are refused by CORS. |

5. **Deploy**: Click Deploy.

## 3. Post-Deployment

- If your `REDIRECT_URL` variable was set to a placeholder, update it in Vercel Settings > Environment Variables, and Redeploy.
- Your app should now be live, and the `/api/` endpoints will be handled by the serverless function.

## 4. Costs

- **Vercel Hobby is free and has no overage billing.** If a limit is exceeded, Vercel pauses the project instead of charging. Don't add a credit card or upgrade to Pro unless you mean to. Pro bills usage past its included amount, so set a spend limit there first. Hobby is for personal, non-commercial use.
- **What runs on Vercel:** the static web app (≈3 MB per first visit, then cached) and one function (`api/index.js`) for Enable Banking and PDF parsing. `vercel.json` caps each call at 30 s, and CORS lets only your own site use the API from a browser.
- **Not on Vercel:** the on-device AI model (≈5 GB) downloads straight from Hugging Face/GitHub into the visitor's browser and costs you nothing. Gemini/Claude calls go from the browser with the key each user enters in Settings, so they're billed to that user's key. No AI key is stored on the server or in the bundle.
- **Enable Banking:** the free "restricted production" mode only works for the bank accounts you linked in the Enable Banking control panel. Other visitors can't connect their banks, and nothing is billed.
- **Upload limit on Vercel:** request bodies are capped at 4.5 MB, so PDFs above roughly 3 MB (base64 adds ⅓) fail there even though the local server accepts 10 MB.

