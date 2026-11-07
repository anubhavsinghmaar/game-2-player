# Publish Just Us Arcade on Netlify

1. Create a GitHub repository. To upload from the arcade directory, replace `YOUR_REPOSITORY_URL` with your new repository's HTTPS URL.

   ```sh
   git init -b main
   git add .
   git commit -m "Build Just Us Arcade"
   git remote add origin YOUR_REPOSITORY_URL
   git push -u origin main
   ```

2. In Netlify, import an existing project from GitHub and select the arcade repository.
3. Deploy. The included `netlify.toml` runs `npm run build`, publishes `dist`, and routes paths like `/demo` through the SPA. Leave environment variables empty.
4. Open the Netlify HTTPS URL on two phones. Create a room on the first, open its invite on the second, then send and paste the reply code. Both phones should enter the same lobby.

Manual deploy also works. Run `npm ci` and `npm run build`, then upload `dist` in Netlify. The build includes `_redirects` for manual uploads.

For a local check of the built files, run `npm run preview`. Loopback is treated as a secure context by modern browsers. Two-device testing should use the public HTTPS deployment.

The site uses a key-free public STUN endpoint to establish direct connections. Some mobile carriers and managed Wi-Fi networks prevent peer-to-peer traffic. Pairing is tested locally in separate Chromium contexts. A test on your actual phones and networks still matters.

[Netlify deployment instructions](https://docs.netlify.com/manage/projects/add-new-project/) · [Vite static deployment guide](https://vite.dev/guide/static-deploy) · [WebRTC data channels](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel) · [Cloudflare public STUN](https://developers.cloudflare.com/realtime/turn/faq/)
