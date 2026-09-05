# Discord Bot + Website — Hostinger GitHub Upload

This is a compact, prebuilt version with fewer than 100 files so it can be uploaded through the GitHub website.

## Important

1. Download this package and extract it on your computer.
2. Upload the **contents of the extracted folder**, not the ZIP file, to GitHub.
3. Do not upload a real Discord token to GitHub.

## Hostinger environment variables

Add these in the Hostinger Node.js application settings:

```env
DISCORD_BOT_TOKEN=your_real_discord_bot_token
NODE_ENV=production
BOT_DATA_FILE=./data/state.json
PORT=5000
```

Use Hostinger's assigned port if it provides one.

## Hostinger startup

Set the startup command to:

```bash
npm start
```

The package contains the built Discord bot, API, and website. No source build or `pnpm install` is required for this compact upload.

The website is served by the same process as the Discord bot. The bot's real server and member statistics stream to the website after the token is configured.