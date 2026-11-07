# Build blueprint

1. Define a shared room reducer and an in-memory same-device adapter. Keep private answers separate from shared round state.
2. Build the arcade entrance, searchable game catalog, room lobby, and reusable play surfaces. Design for two phones first.
3. Implement representative engines for sealed choices, predictions, timed quiz, boards, memory, split puzzles, drawing, creative turns, and consent.
4. Pair two phones through a key-free WebRTC data channel. Use an invitation link and reply code for signaling. Distribute only the static Netlify build.
5. Verify pure rules, direct pairing and gameplay in separate browsers, and mobile layout. Record launch coverage and deployment steps.
