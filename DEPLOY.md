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
   git remote add origin https://github.com/YOUR_USERNAME/repo-name.git
   git push -u origin main
   ```
   > **Note**: Your `.pem` file is strictly ignored by `.gitignore` and will NOT be uploaded. This is correct.

## 2. Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and "Add New > Project".
2. Import your GitHub repository.
3. Vercel should detect "Expo" or "Create React App".
4. **Environment Variables**: You MUST add the following variables in the Vercel Project Settings before deploying (or during the import step):

   | Variable Name | Value | Description |
   |Data|---|---|
   | `ENABLE_BANKING_APP_ID` | `3325a771-fed9-4e4a-b6c6-f41a1194c853` | Your App ID |
   | `ENABLE_BANKING_PRIVATE_KEY` | _(Content of your .pem file)_ | Open your `.pem` file via notepad, copy ALL the text (including BEGIN/END headers) and paste it here. |
   | `REDIRECT_URL` | `https://your-project-name.vercel.app` | The URL provided by Vercel (you might need to deploy once to get this, or guess it). Defaults to localhost if missing. |

5. **Deploy**: Click Deploy.

## 3. Post-Deployment

- If your `REDIRECT_URL` variable was set to a placeholder, update it in Vercel Settings > Environment Variables, and Redeploy.
- Your app should now be live, and the `/api/` endpoints will be handled by the serverless function.
