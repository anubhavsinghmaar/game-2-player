# Just Us Arcade

A private arcade for two. Browse 69 offerings across eight worlds, with 54 playable games and quiz categories. The same room supports ready checks, sealed answers, board games, quizzes, shared drawing, split-clue puzzles, and rematches.

[Phone home screen](docs/phone-home.png) · [Phone gameplay](docs/phone-game.png)

## Run locally

Use Node 22.18 or newer.

```sh
npm ci
npm run dev
```

Open the printed URL. Choose **Explore demo** for two seats on one device. The demo is labeled **Local Demo** and uses **Switch seat** to hand off the screen.

## Play on two devices

1. Open the HTTPS site and select **Create our room**. Pick a nickname and copy the invitation link into your private chat.
2. Your partner opens the link, picks a nickname, and sends the generated reply code back to you.
3. Paste their code into **Connect room**. Choose a game, tap ready on both devices, and start from the host's seat.

The site runs on static Netlify hosting with zero API keys, environment variables, or accounts for players. It uses an encrypted WebRTC data channel and Cloudflare's public STUN endpoint for network discovery. The invite and reply carry connection details and should be shared privately. Direct connections work only when both networks permit a route. Try another Wi-Fi or mobile data connection if pairing fails.

The room lives in the open tabs. Closing or refreshing one ends the connection and requires a new invitation. Short network interruptions may recover while both tabs remain open. Browser preferences and favorites are kept locally. Game content and answers live in memory, and there is no persistent vault.

## Deploy and verify

- [Netlify setup](NETLIFY_DEPLOY.md)
- [Full game roster](GAME_STATUS.md)
- [Tests and coverage](TEST_REPORT.md)
- [Content editing](CONTENT_GUIDELINES.md)
- [Image credits](ASSET_CREDITS.md)

```sh
npm run lint
npm run typecheck
npm test
npm run content-validation
npm run build
```

The Vite build produces static HTML, CSS, JavaScript, and assets in `dist/`.
