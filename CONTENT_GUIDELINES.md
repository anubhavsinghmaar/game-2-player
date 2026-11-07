# Edit arcade content

- `src/games/registry.ts` defines the offering, world, length, difficulty, and engine. Add an engine only when the game can be played from the lobby through results.
- `src/data/quiz.ts` defines question packs with IDs, options or an integer estimate, correct answer, explanation, difficulty, and optional source and media IDs. The validator catches structural mistakes. For unfamiliar or contestable facts, check a primary source before release and include its URL.
- `src/data/prompts.ts` holds the conversation packs. Keep prompts specific, inclusive, easy to skip, and comfortably playable on a small screen. Adult decks should be non-graphic and give both players room to pass.
- `src/data/scenarios.ts` holds puzzle briefs, seat-specific clues, accepted answers, hints, and evidence. Check both clue perspectives and common spelling variants. Puzzle and quiz solutions are part of the static app bundle, so someone inspecting its code can find them.
- `src/data/mediaManifest.ts` records source, creator, license and verification date. Add only licensed or public-domain assets with a local optimized copy and a matching credit. Update `ASSET_CREDITS.md`.
- Run `npm run content-validation` and try the affected game from each seat.

Bollywood, Animal Kingdom, and Science & Space each have 20 questions. The remaining quiz packs are smaller starter packs. Source links are included where recorded. Unlinked questions use stable general knowledge and are candidates for expanded source review.
