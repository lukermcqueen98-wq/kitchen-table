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

**The all-cards picture index** (so clicks can find any card, not just commanders and cards someone looked up) is only built when you ask: open **Actions > Build card index > Run workflow**. The first build covers every Magic card and takes a few hours; it saves progress as it goes, so you can stop it and run it again later to carry on. After that, a run only adds cards the index doesn't have yet, so picking up a new set takes minutes. Deploy site keeps whatever index was built last.

Hosting matters. The phone camera QR code and the all-cards index only work from the hosted page, and Chrome remembers the microphone permission there. Opened as a local file, captions may ask for the mic every time they restart.

### Local file

Double-click `index.html`. Players each open their own copy and type the same table code.

## Features

- **Layout**: the cameras take the middle of the screen. The top bar has the game controls in the middle (game clock, **Pass turn**, which lights up when it's yours to pass, and **Dice**, which includes Roll for first) and your own controls on the right (mic, camera, captions, and **More** for your phone camera, flipping your camera, a new game, and leaving). The side panel has tabs: **Card**, **Log** (table log and damage history), **Captions**, and **Table** (game mode, monarch, turn clock, game records). A tab you're not looking at shows how many new things arrived there. **Hide panel** gives the cameras the whole width; looking a card up brings the panel back.
- **Commanders**: set yours from your camera ("Set commander"). Under its name everyone sees its color identity as mana symbols and its base power/toughness (or a planeswalker's starting loyalty); hover for the card, click to read it.
- **Game modes**: Commander (up to 4, 40 life), **1v1 Commander** (2 players, 30 life), Brawl (30 life), and 60-card formats (20 life). The host (the lowest occupied seat) picks the mode in the Table panel, and it syncs to everyone. Switching mid-game starts a new game for everyone. A third player trying to join a 1v1 table is sent back to the lobby with a message.
- **Movable cameras**: drag the ⠿ handle on a player's camera onto another camera to swap them. Arrow keys work on the handle too. Your layout is only on your screen and is remembered for that table.
- **Table log**: life gains and losses are logged for every player, grouped into one line per burst of clicks, for example `Rick lost 3 life (40 → 37).` Turns are numbered per player and for the whole game, for example `Rick's turn 3 (game turn 7).`, and the active player's camera shows "Your turn 3". A new game starts the count over.
- **Leave and come back**: rejoin the same table code during a game and your life, counters, commander damage, and commanders come back, and the turn stays where it was. Your browser saves your part of the game, and the other players remember you too, so it works after a refresh, after leaving, or from a different device. When a player drops on their turn it stays their turn; anyone can pass it if they don't return. A new game starts fresh.
- **Counters**: poison, experience, energy, plus **Other counters**: +1/+1, -1/-1, loyalty, defense, charge, time, lore, oil, shield, stun, finality, level, quest, storage, age, fade, doom, rad, ticket, or any name you type. Counters can go on you or on a named card, and everyone sees them.
- **Card recognition by picture**: click a card's art on any camera, or drag a box around a card (or just its art) for a tight spot. Like SpellTable, a ring pulses where you clicked, then snaps to an outline around the card it found and a scan line sweeps over it as the card opens.
  - **Card finder**: before the AI looks, OpenCV (a computer vision library, about 11 MB, downloaded once) finds the straight edges around your click and picks out the card (or its art box), even on a busy playmat with other cards touching it. The card is then straightened out, so turned, tapped, upside-down, and tilted cards are read squarely. If it can't find an outline, the matcher falls back to trying boxes of likely sizes around the click. The outline is dashed amber when it's only a closest match, and flashes red when nothing was found.
  - An AI model (DINOv2-small) runs in your browser, on your graphics card through WebGPU when available, and finds the **closest match** among the cards it knows. The first use downloads it (about 25 to 45 MB), and it is cached after that.
  - On the hosted page it can find **any Magic card**: a GitHub Action (`.github/workflows/card-index.yml` running `tools/build-index.mjs`) fingerprints every unique card artwork on Scryfall and publishes the index with the site. Each player downloads it once (about 20 MB, covering about 52,000 artworks). Commanders at the table get a small head start.
  - Without the index (a local file, or before the first build finishes) it knows the table's commanders and every card anyone looks up.
  - When you click another player's card, their browser sends a full-quality still of their camera, because the live video you receive is compressed.
  - When it isn't sure, it still shows its closest match with runners-up underneath. Picking the right one teaches it how that card looks on your camera, so it gets better as you play.
- **Matching log**: every card click is recorded in your browser (how sure the matcher was, and whether you corrected it). Open **Matching log** under the card search and click **Export log** to share it, so the matcher's "sure enough" settings can be tuned from real games.
- **Game records**: starting a new game asks who won, and the result (winner, commanders, length, turns, final life) is saved in every player's browser. The **Game records** panel shows wins per player and exports to CSV.
- **Card history**: under the card you're reading, a picture of every card you've looked up, been shown, or heard played, newest first (like SpellTable's), so you can jump back to any of them. Saved in your browser. Clicking a card name in the captions or the table log scrolls the panel up to the card.
- **Captions follow the game**: captions switch on when a player says what they're doing, and show just that: "I take 3 damage", "I gain 2 life", "I heal 4", "I pay 2 life", "I play Sol Ring", "I cast Counterspell and Swords to Plowshares". Card names are underlined (click one to read it); a card that can't be made out shows as "_". Other talk isn't captioned. Voice commands still hear everything. Turn it off under Captions to caption every word.
- **Terms library**: the **Terms** tab lists every Magic keyword, keyword action, and ability word (from Scryfall's lists, so new sets are included) plus game terms like the stack, exile, upkeep, and commander damage, with what each means and a link to its full rules. Search it by name or meaning.
- **Card names in captions**: names said the way people say them still link: "soul ring" finds Sol Ring, "commander sphere" Commander's Sphere, and a legend's short name ("Gwenom", even heard as "Gwen um") the full card.
- **Cards you say you play**: say "I play Sol Ring", "I'm casting Counterspell", or "I cast Rhystic Study and Arcane Signet" and the cards pop up on your camera for everyone for 10 seconds (several side by side; click one to read it), and the table log records them. Your browser works out the cards once and sends them with your caption, so every screen shows the same cards. Lands aren't shown. If a card name can't be made out, your screen says "Please repeat what card you played". Turn it off under Captions.
- **Captions and voice commands**: they use Chrome's or Edge's built-in speech recognition, with your deck's card names and the players' names as hints. In recent desktop Chrome you can pick **Chrome on-device** so audio never leaves your computer. Voice commands include "I take 3 from Rick", "gain 5 life", "pass turn", and card lookups like "what does Rhystic Study do", "show me Sol Ring", or "look up Smothering Tithe".
  - Each player's own browser normally captions their own speech. When a friend's captions aren't coming through (turned off, a browser without speech to text, or a blocked speech service), your computer captions them from the audio you already hear, using Whisper (an open speech model, about 80 MB, downloaded once). It steps aside as soon as their own captions arrive. The Captions panel shows each player's status, with a checkbox to turn this off and a button to ask them to turn their captions on.
  - **Lisp-friendly matching**: tick **I have a lisp** on your own screen (this also helps your voice commands), or **Has a lisp** next to a player. "Th", "sh" and "z" then count as "s" when matching card names, so "Thol Ring" still links Sol Ring.

## Tests

**Matching benchmark**: **Actions > Matching benchmark** measures how often a click finds the right card. It draws real cards from Scryfall onto made-up webcam pictures (busy playmats, neighboring cards, turned and tilted cards, glare, blur, color cast, noise, compression) and runs the page's own matcher with the real AI model and index. The run's summary shows the share of right answers for the old click matching, the card finder, and a perfectly found card, and its files include pictures of the misses.

`tests/` holds browser tests that play the game with two or three Chromium players (joining, rejoining, life and turns, card matching, captions, decks, and the index builder). GitHub runs them on every pull request and every change to `main`. See `tests/README.md` to run them yourself.

## Troubleshooting

- **A friend sees the table but never gets video**: one of you is behind a strict network. Add a TURN relay (Metered, Twilio) under **Connection settings** in the lobby. Both players do this, then rejoin.
- **The AI matcher says it couldn't load**: the basic color-based picture matcher still works. The model downloads from huggingface.co and the library from cdn.jsdelivr.net, so check that neither is blocked.
- **Clicks only find commanders and cards someone looked up**: the all-cards index hasn't been built yet, or only partly. Run **Actions > Build card index**; its log says how many artworks are indexed and which model it used.
