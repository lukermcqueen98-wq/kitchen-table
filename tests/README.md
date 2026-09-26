# Kitchen Table tests

Browser tests that play the game the way people do: two or three Chromium players join a table through a local
PeerJS signaling server, with fake cameras and microphones. Scryfall, Moxfield/Archidekt, the AI models
(transformers.js) and speech recognition are replaced with stand-ins, so the tests need nothing from the internet
besides installing packages.

What's covered:

- **connect**: three players all see each other (including the table's first player)
- **modes**: 1v1 Commander syncs from the host, turns a third player away, host-only switching
- **table**: life log grouping, counters, dragging cameras, turn numbers, game records
- **rejoin**: life, counters and the turn come back after a refresh, from a new device, and for the host alone
- **matching**: picture matching from the all-cards index on another player's camera, corrections, the matching
  log, recent cards, and the index loading from browser storage
- **captions**: lisp matching, voice commands and lookups, caption status and problems, captioning a friend from
  their audio, the diagnostics report
- **decks**: saved decks and deck-link import
- **build-index**: the index builder skips what it should, keeps both faces, and only adds new cards on a re-run

Run them:

```
npm ci --prefix tools
npm ci --prefix tests
cd tests
npx playwright install chromium   # first time only
npx playwright test
```

`support/fixtures.mjs` generates the test pictures, fake camera video and fake microphone audio into `.fixtures/`.
GitHub runs these tests on every pull request and every change to `main` (`.github/workflows/tests.yml`).
