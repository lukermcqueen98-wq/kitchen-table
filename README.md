# kitchen-table

Play paper Magic: The Gathering over webcam. Point a camera at your playmat, share the table code, and click any card on screen to read it.

Everything is one file, `index.html`. There is no build step and no server of your own: video goes directly between players (WebRTC), and PeerJS's free cloud service introduces players to each other.

## Running it

Use **Chrome or Edge** on a computer. Captions, voice commands, and the AI card matcher depend on features those browsers have.

### Hosted (recommended)

1. On GitHub, open this repo's **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Every push to `main` runs **Deploy site**, which publishes the page in about a minute. To publish without a change, open **Actions > Deploy site > Run workflow**.
4. The page is live at `https://<your-username>.github.io/kitchen-table/`.
5. Open it, click **Sit down**, then **Copy invite link** and send it to your friends.

**The all-cards picture index** (so clicks can find any card, not just ones in decklists) is only built when you ask: open **Actions > Build card index > Run workflow**. The first build covers every Magic card and takes a few hours; it saves progress as it goes, so you can stop it and run it again later to carry on. After that, a run only adds cards the index doesn't have yet, so picking up a new set takes minutes. Deploy site keeps whatever index was built last.

Hosting matters. The phone camera QR code and the all-cards index only work from the hosted page, and Chrome remembers the microphone permission there. Opened as a local file, captions may ask for the mic every time they restart.

### Local file

Double-click `index.html`. Players each open their own copy and type the same table code.

## Features

- **Saved decks**: save any number of decklists in your browser and pick one in the lobby; your last deck is picked for you. **Import** from a Moxfield or Archidekt link works when that site lets other pages read its decks; if it doesn't, the page tells you to copy the list from the site's Export option instead.
- **Game modes**: Commander (up to 4, 40 life), **1v1 Commander** (2 players, 20 life), Brawl (30 life), and 60-card formats (20 life). The host (the lowest occupied seat) picks the mode in the Table panel, and it syncs to everyone. Switching mid-game starts a new game for everyone. A third player trying to join a 1v1 table is sent back to the lobby with a message.
- **Movable cameras**: drag the ⠿ handle on a player's camera onto another camera to swap them. Arrow keys work on the handle too. Your layout is only on your screen and is remembered for that table.
- **Table log**: life gains and losses are logged for every player, grouped into one line per burst of clicks, for example `Rick lost 3 life (40 → 37).` Turns are numbered per player and for the whole game, for example `Rick's turn 3 (game turn 7).`, and the active player's camera shows "Your turn 3". A new game starts the count over.
- **Leave and come back**: rejoin the same table code during a game and your life, counters, commander damage, and commanders come back, and the turn stays where it was. Your browser saves your part of the game, and the other players remember you too, so it works after a refresh, after leaving, or from a different device. When a player drops on their turn it stays their turn; anyone can pass it if they don't return. A new game starts fresh.
- **Counters**: poison, experience, energy, plus **Other counters**: +1/+1, -1/-1, loyalty, defense, charge, time, lore, oil, shield, stun, finality, level, quest, storage, age, fade, doom, rad, ticket, or any name you type. Counters can go on you or on a named card, and everyone sees them.
- **Card recognition by picture**: click a card's art on any camera, or drag a box around a card (or just its art) for a tight spot.
  - An AI model (DINOv2-small) runs in your browser, on your graphics card through WebGPU when available, and finds the **closest match** among the cards it knows. The first use downloads it (about 25 to 45 MB), and it is cached after that.
  - On the hosted page it can find **any Magic card**: a GitHub Action (`.github/workflows/pages.yml` running `tools/build-index.mjs`) fingerprints every unique card artwork on Scryfall and publishes the index with the site. Each player downloads it once (about 17 MB). Cards in the table's decklists get a small head start, so pasting your decklist still helps with lookalikes.
  - Without the index (a local file, or before the first build finishes) it knows the table's decklists, commanders, and every card anyone looks up.
  - When you click another player's card, their browser sends a full-quality still of their camera, because the live video you receive is compressed.
  - When it isn't sure, it still shows its closest match with runners-up underneath. Picking the right one teaches it how that card looks on your camera, so it gets better as you play.
- **Matching log**: every card click is recorded in your browser (how sure the matcher was, and whether you corrected it). Open **Matching log** under the card search and click **Export log** to share it, so the matcher's "sure enough" settings can be tuned from real games.
- **Game records**: starting a new game asks who won, and the result (winner, commanders, length, turns, final life) is saved in every player's browser. The **Game records** panel shows wins per player and exports to CSV.
- **Recent cards**: every card you look up is listed under the search box, newest first, so you can jump back. Saved in your browser. Clicking a card name in the captions or the table log scrolls the panel up to the card.
- **Captions and voice commands**: they use Chrome's or Edge's built-in speech recognition, with your deck's card names and the players' names as hints. In recent desktop Chrome you can pick **Chrome on-device** so audio never leaves your computer. Voice commands include "I take 3 from Rick", "gain 5 life", "pass turn", and card lookups like "what does Rhystic Study do", "show me Sol Ring", or "look up Smothering Tithe".
  - Each player's own browser normally captions their own speech. When a friend's captions aren't coming through (turned off, a browser without speech to text, or a blocked speech service), your computer captions them from the audio you already hear, using Whisper (an open speech model, about 80 MB, downloaded once). It steps aside as soon as their own captions arrive. The Captions panel shows each player's status, with a checkbox to turn this off and a button to ask them to turn their captions on.
  - **Lisp-friendly matching**: tick **I have a lisp** on your own screen (this also helps your voice commands), or **Has a lisp** next to a player. "Th", "sh" and "z" then count as "s" when matching card names, so "Thol Ring" still links Sol Ring.

## Troubleshooting

- **A friend sees the table but never gets video**: one of you is behind a strict network. Add a TURN relay (Metered, Twilio) under **Connection settings** in the lobby. Both players do this, then rejoin.
- **The AI matcher says it couldn't load**: the basic color-based picture matcher still works. The model downloads from huggingface.co and the library from cdn.jsdelivr.net, so check that neither is blocked.
- **Clicks only find cards from decklists**: the all-cards index hasn't been built yet, or only partly. Run **Actions > Build card index**; its log says how many artworks are indexed and which model it used.
