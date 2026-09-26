# kitchen-table

Play paper Magic: The Gathering over webcam. Point a camera at your playmat, share the table code, and click any card on screen to read it.

Everything is one file, `index.html`. There is no build step and no server of your own: video goes directly between players (WebRTC), and PeerJS's free cloud service introduces players to each other.

## Running it

Use **Chrome or Edge** on a computer. Captions, voice commands, and the AI card matcher depend on features those browsers have.

### Hosted (recommended)

1. On GitHub, open this repo's **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, pick `main` and `/ (root)`, and save.
3. After a minute the page is live at `https://<your-username>.github.io/kitchen-table/`.
4. Open it, click **Sit down**, then **Copy invite link** and send it to your friends.

Hosting matters. The phone camera QR code only works from the hosted page, and Chrome remembers the microphone permission there. Opened as a local file, captions may ask for the mic every time they restart.

### Local file

Double-click `index.html`. Players each open their own copy and type the same table code.

## Features

- **Game modes**: Commander (up to 4, 40 life), **1v1 Commander** (2 players, 20 life), Brawl (30 life), and 60-card formats (20 life). The host (the lowest occupied seat) picks the mode in the Table panel, and it syncs to everyone. Switching mid-game starts a new game for everyone. A third player trying to join a 1v1 table is sent back to the lobby with a message.
- **Movable cameras**: drag the ⠿ handle on a player's camera onto another camera to swap them. Arrow keys work on the handle too. Your layout is only on your screen and is remembered for that table.
- **Table log**: life gains and losses are logged for every player, grouped into one line per burst of clicks, for example `Rick lost 3 life (40 → 37).`
- **Counters**: poison, experience, energy, plus **Other counters**: +1/+1, -1/-1, loyalty, defense, charge, time, lore, oil, shield, stun, finality, level, quest, storage, age, fade, doom, rad, ticket, or any name you type. Counters can go on you or on a named card, and everyone sees them.
- **Card recognition by picture**: click a card's art on any camera, or drag a box around a card (or just its art) for a tight spot.
  - An AI model (DINOv2-small) runs in your browser, on your graphics card through WebGPU when available, and finds the **closest match** among the cards it knows. The first use downloads it (about 25 to 45 MB), and it is cached after that.
  - It knows every card in the table's decklists, every commander, and every card anyone looks up (search, caption links, recent cards). Paste your decklist in the lobby for the best results.
  - When you click another player's card, their browser sends a full-quality still of their camera, because the live video you receive is compressed.
  - When it isn't sure, it still shows its closest match with runners-up underneath. Picking the right one teaches it how that card looks on your camera, so it gets better as you play.
- **Recent cards**: every card you look up is listed under the search box, newest first, so you can jump back. Saved in your browser. Clicking a card name in the captions or the table log scrolls the panel up to the card.
- **Captions and voice commands**: they use Chrome's or Edge's built-in speech recognition, with your deck's card names and the players' names as hints. In recent desktop Chrome you can pick **Chrome on-device** so audio never leaves your computer. Voice commands include "I take 3 from Rick", "gain 5 life", and "pass turn".
  - Each player's own browser captions their own speech, so a friend's words only show up if captions are on for them. The Captions panel shows each player's status and has an **Ask them to turn on captions** button.
  - **Lisp-friendly matching**: tick **I have a lisp** on your own screen (this also helps your voice commands), or **Has a lisp** next to a player. "Th", "sh" and "z" then count as "s" when matching card names, so "Thol Ring" still links Sol Ring.

## Troubleshooting

- **A friend sees the table but never gets video**: one of you is behind a strict network. Add a TURN relay (Metered, Twilio) under **Connection settings** in the lobby. Both players do this, then rejoin.
- **The AI matcher says it couldn't load**: the basic color-based picture matcher still works. The model downloads from huggingface.co and the library from cdn.jsdelivr.net, so check that neither is blocked.
