# Verification

Run on Node 22.23.4 with a local preview of the production build.

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 10 passed |
| `npm run content-validation` | 69 catalog entries, 137 quiz questions, prompt and scenario packs, 2 local images validated |
| `npm run build` | Passed. Vite emitted static files in `dist`. Rollup stripped two nonblocking annotation comments from Zod. |
| `npm run test:browser` | 2 passed against the production build, using Google Chrome via Playwright |

Unit tests cover registry startup, private rounds and deadlines, consent revocation, Connect Four gravity and diagonal wins, Reversi captures and ending, Dots & Boxes, puzzle progression, and stale actions.

Browser checks cover the 360px demo, the 390px room, direct invite and reply pairing in isolated contexts, sealed answer traffic, Connect Four and rematch, drawing and undo, split clues, and two independent After Dark choices followed by skipping and revocation. The browser contexts ran on one computer. Physical phones, separate carriers, Safari, and a public Netlify deployment were outside this run.

## Reproduce the browser tests

```sh
npm ci
npm run build
npx playwright install chromium
npm run preview -- --host 127.0.0.1 --port 4173
```

In another terminal, run `npm run test:browser`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a local Chrome executable if desired. `TEST_SCREENSHOT_DIR` writes optional screenshots. Direct pairing needs a permitted WebRTC route between the test browsers.
