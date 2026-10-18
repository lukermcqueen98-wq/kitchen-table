/* Magic terms, shared by the webcam table (captions, the Terms tab) and the digital table (Terms):
   [name, what it means, forms flag ("v": a verb, so "scries"/"scried" match too; "p": a noun with a plural)] */
window.KT_KEYWORDS = [
  ["Deathtouch", "Any amount of damage this deals to a creature is enough to destroy it."],
  ["Defender", "This creature can't attack."],
  ["Double strike", "This creature deals both first-strike and regular combat damage."],
  ["First strike", "This creature deals combat damage before creatures without first strike."],
  ["Enchant", "Says what an Aura can be attached to. It can only be cast targeting, and stay attached to, that kind of object."],
  ["Equip", "Pay the equip cost to attach this Equipment to a creature you control. You can only do this when you could cast a sorcery.", "v"],
  ["Flash", "You may cast this spell any time you could cast an instant."],
  ["Flying", "Can't be blocked except by creatures with flying or reach."],
  ["Haste", "This creature can attack and use tap abilities the turn it comes under your control."],
  ["Hexproof", "Can't be the target of spells or abilities your opponents control."],
  ["Indestructible", "Can't be destroyed by damage or by effects that say \"destroy.\" It can still be exiled, sacrificed, or have its toughness reduced to 0."],
  ["Lifelink", "Damage dealt by this source also causes its controller to gain that much life."],
  ["Menace", "Can't be blocked except by two or more creatures."],
  ["Protection", "Can't be damaged, enchanted or equipped, blocked, or targeted by anything with the stated quality."],
  ["Reach", "This creature can block creatures with flying."],
  ["Trample", "When blocked, combat damage beyond what's lethal to the blockers can be dealt to the player, planeswalker, or battle it's attacking."],
  ["Vigilance", "Attacking doesn't cause this creature to tap."],
  ["Ward", "Whenever this becomes the target of a spell or ability an opponent controls, counter it unless that player pays the ward cost."],
  ["Prowess", "Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn."],
  ["Scry", "Look at that many cards from the top of your library. Put any number on the bottom and the rest back on top in any order.", "v"],
  ["Surveil", "Look at that many cards from the top of your library. Put any number into your graveyard and the rest back on top in any order.", "v"],
  ["Mill", "Put that many cards from the top of a library into its owner's graveyard.", "v"],
  ["Proliferate", "Choose any number of permanents and/or players, then give each another counter of each kind already there.", "v"],
  ["Investigate", "Create a Clue token.", "v"],
  ["Treasure", "An artifact token with \"{T}, Sacrifice this: Add one mana of any color.\"", "p"],
  ["Food", "An artifact token with \"{2}, {T}, Sacrifice this: You gain 3 life.\"", "p"],
  ["Clue", "An artifact token with \"{2}, Sacrifice this: Draw a card.\"", "p"],
  ["Cascade", "When you cast this spell, exile cards from the top of your library until you exile a nonland card with lower mana value. You may cast it without paying its mana cost. Put the rest on the bottom in a random order.", "v"],
  ["Convoke", "Your creatures can help cast this spell. Each creature you tap while casting it pays for {1} or one mana of that creature's color."],
  ["Cycling", "Pay the cycling cost and discard this card: draw a card."],
  ["Flashback", "You may cast this card from your graveyard for its flashback cost. Then exile it."],
  ["Kicker", "You may pay an additional cost as you cast this spell for an extra effect.", "v"],
  ["Landfall", "An ability word for abilities that trigger whenever a land enters the battlefield under your control."],
  ["Storm", "When you cast this spell, copy it for each spell cast before it this turn."],
  ["Affinity", "This spell costs {1} less to cast for each of the named thing you control."],
  ["Annihilator", "Whenever this creature attacks, the defending player sacrifices that many permanents."],
  ["Infect", "Deals damage to creatures as -1/-1 counters and to players as poison counters."],
  ["Toxic", "Players dealt combat damage by this creature also get that many poison counters."],
  ["Wither", "Deals damage to creatures as -1/-1 counters."],
  ["Persist", "When this creature dies, if it had no -1/-1 counters on it, return it to the battlefield with a -1/-1 counter on it."],
  ["Undying", "When this creature dies, if it had no +1/+1 counters on it, return it to the battlefield with a +1/+1 counter on it."],
  ["Evoke", "You may cast this spell for its evoke cost. If you do, it's sacrificed when it enters.", "v"],
  ["Ninjutsu", "Pay the ninjutsu cost and return an unblocked attacker you control to hand: put this card onto the battlefield tapped and attacking."],
  ["Partner", "You can have two commanders if both have partner."],
  ["Exalted", "Whenever a creature you control attacks alone, it gets +1/+1 until end of turn for each instance of exalted among permanents you control."],
  ["Myriad", "Whenever this attacks, for each other opponent, you may create a token copy tapped and attacking that player or their planeswalker. Exile the tokens at end of combat."],
  ["Split second", "While this spell is on the stack, players can't cast spells or activate abilities that aren't mana abilities."],
  ["Crew", "Tap any number of untapped creatures you control with total power at least the crew number: this Vehicle becomes an artifact creature until end of turn.", "v"],
  ["Delve", "Each card you exile from your graveyard while casting this spell pays for {1}."],
  ["Dredge", "If you would draw a card, you may instead mill that many cards and return this card from your graveyard to your hand.", "v"],
  ["Escape", "You may cast this card from your graveyard for its escape cost, which includes exiling other cards from your graveyard."],
  ["Foretell", "During your turn, pay {2} and exile this card face down. Cast it on a later turn for its foretell cost.", "v"],
  ["Connive", "Draw a card, then discard a card. If you discarded a nonland card, put a +1/+1 counter on this creature.", "v"],
  ["Explore", "Reveal the top card of your library. If it's a land, put it in your hand. Otherwise, put a +1/+1 counter on this creature, then you may put that card into your graveyard.", "v"],
  ["Amass", "Put that many +1/+1 counters on an Army you control. If you don't control one, create a 0/0 Army creature token first.", "v"],
  ["Extort", "Whenever you cast a spell, you may pay {W/B}. If you do, each opponent loses 1 life and you gain that much life."],
  ["Morph", "You may cast this face down as a 2/2 creature for {3}. Turn it face up any time for its morph cost."],
  ["Disguise", "You may cast this face down as a 2/2 creature with ward {2} for {3}. Turn it face up any time for its disguise cost."],
  ["Changeling", "This object is every creature type."],
  ["Buyback", "You may pay an additional buyback cost as you cast this. If you do, put it into your hand as it resolves."],
  ["Devour", "As this enters, you may sacrifice any number of creatures. It enters with that many +1/+1 counters for each creature sacrificed.", "v"],
  ["Echo", "At the beginning of your upkeep, if this came under your control since your last upkeep, sacrifice it unless you pay its echo cost."],
  ["Fabricate", "When this enters, put that many +1/+1 counters on it or create that many 1/1 Servo artifact creature tokens."],
  ["Exploit", "When this creature enters, you may sacrifice a creature.", "v"],
  ["Emerge", "You may cast this by sacrificing a creature and paying the emerge cost, reduced by that creature's mana value."],
  ["Battle cry", "Whenever this creature attacks, each other attacking creature gets +1/+0 until end of turn."],
  ["Bloodthirst", "If an opponent was dealt damage this turn, this creature enters with that many +1/+1 counters."],
  ["Goad", "Until your next turn, the goaded creature attacks each combat if able and attacks a player other than you if able.", "v"],
  ["Suspend", "Exile this from your hand with that many time counters by paying the suspend cost. Remove one each upkeep. When the last is removed, cast it without paying its mana cost.", "v"],
  ["Rebound", "If you cast this from your hand, exile it as it resolves. At your next upkeep, you may cast it from exile without paying its mana cost."],
  ["Unearth", "Pay the unearth cost: return this from your graveyard to the battlefield with haste. Exile it at the next end step or if it would leave the battlefield.", "v"],
  ["Jump-start", "You may cast this from your graveyard by paying its cost and discarding a card. Then exile it."],
  ["Overload", "You may cast this for its overload cost. If you do, change \"target\" in its text to \"each.\"", "v"],
  ["Madness", "If you discard this card, you may cast it for its madness cost instead of putting it into your graveyard."],
  ["Mutate", "Cast this for its mutate cost targeting a non-Human creature you own. Merge it on top or underneath. The merged creature has all their abilities.", "v"],
  ["Blitz", "Cast this for its blitz cost. It gains haste and \"When this dies, draw a card,\" and is sacrificed at the next end step."],
  ["Casualty", "As you cast this, you may sacrifice a creature with at least that much power. If you do, copy the spell."],
  ["Training", "Whenever this creature attacks with another creature with greater power, put a +1/+1 counter on it."],
  ["Hideaway", "When this enters, look at that many cards from the top of your library, exile one face down, and put the rest on the bottom. You may play it later without paying its mana cost when a condition is met."],
  ["Commander tax", "Casting your commander from the command zone costs {2} more for each previous time you've cast it from there this game."],
  ["Mana value", "The total amount of mana in a card's mana cost. X counts as 0 except while the spell is on the stack."],
  ["Monarch", "The monarch draws an extra card at the beginning of their end step. Deal combat damage to the monarch to become the monarch."],
  ["Initiative", "When you take the initiative and at the beginning of your upkeep, venture into Undercity. Deal combat damage to the player with the initiative to take it."],
  ["Venture into the dungeon", "Move your marker into the first room of a dungeon, or to the next room of the one you're in, and get that room's effect."],
  ["The Ring tempts you", "Choose a creature you control as your Ring-bearer. Your Ring gains its next ability, up to four."],
  ["Energy", "Counters a player can get, shown as {E}, and spend to pay costs.", "p"],
  ["Poison", "A player with ten or more poison counters loses the game."],
  // Game terms people say all the time
  ["Graveyard", "Where cards go when they're destroyed, sacrificed, discarded, countered, or finish resolving. Face up; anyone can look.", "p"],
  ["Exile", "A zone for cards removed from the game. Cards there usually stay there unless something lets you play them or return them.", "v"],
  ["Library", "Your deck during the game. Cards are drawn from the top.", "p"],
  ["Battlefield", "Where permanents are: lands, creatures, artifacts, enchantments, planeswalkers, and battles in play."],
  ["The stack", "Where spells and abilities wait to resolve. The last one added resolves first, and players can respond before each one does."],
  ["Upkeep", "The step after untap at the start of each turn. Upkeep triggers happen here, before the draw.", "p"],
  ["Draw step", "The step where the active player draws a card, after upkeep."],
  ["End step", "The first part of the end of a turn. \"At the beginning of the end step\" triggers happen here."],
  ["Combat damage", "Damage dealt by attacking and blocking creatures during the combat damage step."],
  ["Commander damage", "A player dealt 21 or more combat damage by the same commander over the game loses."],
  ["Sacrifice", "Move a permanent you control to its owner's graveyard. It can't be prevented, and it isn't destroying.", "v"],
  ["Token", "A permanent that isn't a card, made by an effect. It stops existing when it leaves the battlefield.", "p"],
  ["Planeswalker", "A permanent type with loyalty. You can activate one of its loyalty abilities once per turn, when you could cast a sorcery.", "p"],
  ["Loyalty", "Counters on a planeswalker. Damage to it removes that many; it's put into the graveyard at 0."],
  ["Mulligan", "Shuffle your opening hand back and draw a new one. In Commander your first mulligan is free; after that, put one card on the bottom for each mulligan.", "v"],
  ["Enters the battlefield", "Triggers when a permanent comes into play (often shortened to ETB)."],
  ["ETB", "Short for \"enters the battlefield\": abilities that trigger when a permanent comes into play."],
  ["Summoning sickness", "A creature can't attack or use {T} abilities unless you've controlled it continuously since your most recent turn began."],
  ["Priority", "The right to cast a spell or activate an ability. Players pass priority back and forth; when all pass in a row, the top of the stack resolves."],
  ["Instant", "A spell you can cast any time you have priority, even during other players' turns.", "p"],
  ["Sorcery", "A spell you can cast only during your main phase when the stack is empty.", "p"],
  ["Legendary", "You can control only one permanent with the same name that's legendary. If you get a second, choose one and put the other into the graveyard."],
  ["Colorless", "Having no color. Colorless mana, shown as {C}, can only be made by certain sources."],
  ["Main phase", "The phases before and after combat where you can play a land and cast sorceries and permanents.", "p"],
  ["Untap", "Turn a tapped permanent upright. Everything you control untaps at the start of your turn.", "v"],
  ["Triggered ability", "An ability that starts with \"when,\" \"whenever,\" or \"at.\" It goes on the stack when its event happens.", "p"],
  ["Activated ability", "An ability written as \"cost: effect.\" You can activate it any time you could cast an instant, unless it says otherwise.", "p"],
  ["Counterspell", "A spell that counters another spell, so it has no effect and goes to the graveyard.", "p"],
  ["Board wipe", "A spell that destroys or removes all or most creatures (or other permanents), like Wrath of God.", "p"],
  ["Ramp", "Getting extra mana early, like extra lands or mana rocks, so you can cast big spells sooner."],
  ["Tutor", "Search your library for a card. Named after Demonic Tutor.", "v"],
  ["Mana rock", "An artifact that makes mana, like Sol Ring or Arcane Signet.", "p"],
  ["Mana dork", "A creature that makes mana, like Llanowar Elves or Birds of Paradise.", "p"],
  ["Day and night", "If it's day and the active player casts no spells during their turn, it becomes night next turn. If it's night and a player casts two or more spells in a turn, it becomes day next turn."]
];

/* More Magic terms for the Terms list (not lit up in webcam captions): [name, what it means, group]. Each is a short
   summary of the official rules (the reminder text, or the Comprehensive Rules), in plain words. */
window.KT_GLOSSARY = [
  // Keyword abilities
  ["Absorb", "If a source would deal damage to this creature, prevent that much of it (up to the absorb number).", "ka"],
  ["Afflict", "Whenever this creature becomes blocked, the defending player loses that much life.", "ka"],
  ["Afterlife", "When this creature dies, create that many 1/1 white and black Spirit creature tokens with flying.", "ka"],
  ["Aftermath", "Cast this half of the split card only from your graveyard. Then exile it.", "ka"],
  ["Amplify", "As this enters, reveal any number of cards in your hand that share a creature type with it. It enters with that many +1/+1 counters for each card revealed.", "ka"],
  ["Ascend", "If you control ten or more permanents, you get the city's blessing for the rest of the game.", "ka"],
  ["Assist", "Another player can help pay this spell's generic mana cost.", "ka"],
  ["Aura swap", "Pay the aura swap cost: exchange this Aura on the battlefield with an Aura card in your hand.", "ka"],
  ["Awaken", "If you cast this for its awaken cost, also put that many +1/+1 counters on target land you control. It becomes a 0/0 Elemental creature with haste that's still a land.", "ka"],
  ["Backup", "When this creature enters, put that many +1/+1 counters on target creature. If it's another creature, it also gains this creature's abilities listed after backup until end of turn.", "ka"],
  ["Banding", "Creatures with banding, plus up to one without, can attack together as a band and are blocked as a group. The player with a creature with banding in combat decides how combat damage dealt to their creatures is divided.", "ka"],
  ["Bargain", "As you cast this spell, you may sacrifice an artifact, enchantment, or token for an extra effect.", "ka"],
  ["Bestow", "You may cast this for its bestow cost as an Aura that enchants a creature. If that creature leaves, this stays on the battlefield as a creature.", "ka"],
  ["Bushido", "Whenever this creature blocks or becomes blocked, it gets +N/+N until end of turn (N is the bushido number).", "ka"],
  ["Champion", "When this enters, sacrifice it unless you exile another permanent you control of the stated kind. When this leaves the battlefield, that card returns.", "ka"],
  ["Cipher", "After this spell resolves, you may exile it encoded on a creature you control. Whenever that creature deals combat damage to a player, you may cast a copy of it without paying its mana cost.", "ka"],
  ["Cleave", "You may cast this spell for its cleave cost. If you do, ignore the words in square brackets.", "ka"],
  ["Companion", "If your starting deck meets this card's condition, it can start the game outside your deck as your companion. Once per game, pay {3} when you could cast a sorcery to put it into your hand.", "ka"],
  ["Compleated", "If life was paid for this planeswalker's Phyrexian mana, it enters with two fewer loyalty counters for each such symbol.", "ka"],
  ["Craft", "Pay the craft cost and exile this and the listed materials (from the battlefield or your graveyard): return it transformed. Only when you could cast a sorcery.", "ka"],
  ["Cumulative upkeep", "At the beginning of your upkeep, put an age counter on this. Then pay its cost once for each age counter, or sacrifice it.", "ka"],
  ["Dash", "You may cast this for its dash cost. If you do, it gains haste and returns to its owner's hand at the beginning of the next end step.", "ka"],
  ["Daybound and nightbound", "Double-faced cards tied to day and night: the daybound face shows during the day and the nightbound face at night. If it's neither day nor night when one appears, it becomes day.", "ka"],
  ["Decayed", "This creature can't block. When it attacks, sacrifice it at end of combat.", "ka"],
  ["Demonstrate", "When you cast this spell, you may copy it. If you do, choose an opponent to also copy it. Copies may choose new targets.", "ka"],
  ["Dethrone", "Whenever this creature attacks the player with the most life (or tied for most), put a +1/+1 counter on it.", "ka"],
  ["Devoid", "This card has no color.", "ka"],
  ["Disturb", "You may cast this card transformed (its back face) from your graveyard for its disturb cost.", "ka"],
  ["Embalm", "Pay the embalm cost and exile this card from your graveyard: create a token copy of it, except it's a white Zombie with no mana cost. Only when you could cast a sorcery.", "ka"],
  ["Encore", "Pay the encore cost and exile this card from your graveyard: for each opponent, create a token copy that attacks that opponent this turn if able. They gain haste and are sacrificed at the next end step. Only when you could cast a sorcery.", "ka"],
  ["Enlist", "As this creature attacks, you may tap a nonattacking creature you control that doesn't have summoning sickness. This creature gets +X/+0 until end of turn, where X is that creature's power.", "ka"],
  ["Entwine", "Choose all modes of this spell if you pay the entwine cost.", "ka"],
  ["Epic", "For the rest of the game you can't cast spells. At the beginning of each of your upkeeps, copy this spell (without its epic ability).", "ka"],
  ["Escalate", "Pay the escalate cost for each mode you choose beyond the first.", "ka"],
  ["Eternalize", "Pay the eternalize cost and exile this card from your graveyard: create a token copy of it, except it's a 4/4 black Zombie with no mana cost. Only when you could cast a sorcery.", "ka"],
  ["Evolve", "Whenever a creature enters under your control, if it has greater power or toughness than this creature, put a +1/+1 counter on this creature.", "ka"],
  ["Exhaust", "An exhaust ability can be activated only once per game.", "ka"],
  ["Fading", "This enters with that many fade counters. At the beginning of your upkeep, remove one. If you can't, sacrifice it.", "ka"],
  ["Fear", "Can't be blocked except by artifact creatures and/or black creatures.", "ka"],
  ["Flanking", "Whenever a creature without flanking blocks this creature, the blocking creature gets -1/-1 until end of turn.", "ka"],
  ["For Mirrodin!", "When this Equipment enters, create a 2/2 red Rebel creature token, then attach this to it.", "ka"],
  ["Forecast", "During your upkeep, you may reveal this card from your hand to use its forecast ability, once each turn.", "ka"],
  ["Fortify", "Pay the fortify cost: attach this Fortification to target land you control. Only when you could cast a sorcery.", "ka"],
  ["Freerunning", "You may cast this spell for its freerunning cost if you dealt combat damage to a player this turn with an Assassin or a commander.", "ka"],
  ["Frenzy", "Whenever this creature attacks and isn't blocked, it gets +N/+0 until end of turn (N is the frenzy number).", "ka"],
  ["Fuse", "You may cast one or both halves of this split card from your hand.", "ka"],
  ["Gift", "As you cast this, you may promise an opponent a gift (like a card, a Food, or a 1/1 Fish). If you do, they get it and the spell gets its bonus.", "ka"],
  ["Graft", "This enters with that many +1/+1 counters. Whenever another creature enters, you may move a +1/+1 counter from this onto it.", "ka"],
  ["Gravestorm", "When you cast this spell, copy it for each permanent put into a graveyard from the battlefield this turn.", "ka"],
  ["Harmonize", "You may cast this card from your graveyard for its harmonize cost. You may tap a creature you control to reduce that cost by its power. Then exile it.", "ka"],
  ["Haunt", "When this creature dies (or this spell resolves), exile it haunting target creature. When the haunted creature dies, the haunt effect happens again.", "ka"],
  ["Hexproof from", "Can't be the target of spells or abilities your opponents control that have the stated quality (like \"hexproof from black\").", "ka"],
  ["Horsemanship", "Can't be blocked except by creatures with horsemanship.", "ka"],
  ["Impending", "You may cast this for its impending cost. If you do, it enters with that many time counters and isn't a creature while it has any. Remove one at the beginning of your end step.", "ka"],
  ["Improvise", "Your artifacts can help cast this spell. Each artifact you tap while casting it pays for {1}.", "ka"],
  ["Ingest", "Whenever this creature deals combat damage to a player, that player exiles the top card of their library.", "ka"],
  ["Intimidate", "Can't be blocked except by artifact creatures and/or creatures that share a color with it.", "ka"],
  ["Job select", "When this Equipment enters, create a 1/1 colorless Hero creature token, then attach this to it.", "ka"],
  ["Landwalk", "Islandwalk, swampwalk and the like: can't be blocked as long as the defending player controls a land of that type.", "ka"],
  ["Level up", "Pay the level up cost: put a level counter on this. Only when you could cast a sorcery. It gets the abilities and size shown for its level.", "ka"],
  ["Living metal", "As long as it's your turn, this Vehicle is also a creature.", "ka"],
  ["Living weapon", "When this Equipment enters, create a 0/0 black Phyrexian Germ creature token, then attach this to it.", "ka"],
  ["Max speed", "An ability marked max speed works only while your speed is 4.", "ka"],
  ["Megamorph", "Like morph: cast it face down as a 2/2 for {3}. When you turn it face up for its megamorph cost, also put a +1/+1 counter on it.", "ka"],
  ["Melee", "Whenever this creature attacks, it gets +1/+1 until end of turn for each opponent you attacked this combat.", "ka"],
  ["Mentor", "Whenever this creature attacks, put a +1/+1 counter on target attacking creature with lesser power.", "ka"],
  ["Miracle", "You may cast this card for its miracle cost when you draw it, if it's the first card you drew this turn.", "ka"],
  ["Mobilize", "Whenever this creature attacks, create that many 1/1 red Warrior creature tokens tapped and attacking. Sacrifice them at the beginning of the next end step.", "ka"],
  ["Modular", "This enters with that many +1/+1 counters. When it dies, you may put its +1/+1 counters on target artifact creature.", "ka"],
  ["More than meets the eye", "You may cast this card converted (its back face up) for its more than meets the eye cost.", "ka"],
  ["Offering", "You may cast this any time you could cast an instant by sacrificing a creature of the stated type and paying the difference in mana costs.", "ka"],
  ["Offspring", "You may pay an extra cost as you cast this. If you do, when it enters, create a 1/1 token copy of it.", "ka"],
  ["Outlast", "Pay the outlast cost and tap this creature: put a +1/+1 counter on it. Only when you could cast a sorcery.", "ka"],
  ["Phasing", "This phases in or out before you untap during each of your untap steps. While phased out, it's treated as though it doesn't exist.", "ka"],
  ["Plot", "Pay the plot cost and exile this card from your hand. On a later turn you may cast it without paying its mana cost, when you could cast a sorcery.", "ka"],
  ["Poisonous", "Whenever this creature deals combat damage to a player, that player gets that many poison counters.", "ka"],
  ["Prototype", "You may cast this with its smaller prototype mana cost, power and toughness. It keeps its other abilities.", "ka"],
  ["Provoke", "Whenever this creature attacks, you may have target creature the defending player controls untap and block it if able.", "ka"],
  ["Prowl", "You may cast this for its prowl cost if you dealt combat damage to a player this turn with a creature that shares a creature type with it.", "ka"],
  ["Rampage", "Whenever this creature becomes blocked, it gets +N/+N until end of turn for each creature blocking it beyond the first.", "ka"],
  ["Ravenous", "This enters with X +1/+1 counters. If X is 5 or more, draw a card when it enters.", "ka"],
  ["Read ahead", "As this Saga enters, choose a chapter and it starts with that many lore counters. Chapters with lower numbers don't trigger.", "ka"],
  ["Reconfigure", "Pay the reconfigure cost: attach this to target creature you control, or unattach it. Only when you could cast a sorcery. While attached, it isn't a creature.", "ka"],
  ["Recover", "When a creature is put into your graveyard from the battlefield, you may pay the recover cost. If you do, return this card from your graveyard to your hand. If you don't, exile it.", "ka"],
  ["Reinforce", "Pay the reinforce cost and discard this card: put that many +1/+1 counters on target creature.", "ka"],
  ["Renown", "When this creature deals combat damage to a player, if it isn't renowned, put that many +1/+1 counters on it and it becomes renowned.", "ka"],
  ["Replicate", "When you cast this spell, copy it once for each time you paid its replicate cost.", "ka"],
  ["Retrace", "You may cast this card from your graveyard by discarding a land card in addition to paying its other costs.", "ka"],
  ["Riot", "This creature enters with your choice of a +1/+1 counter or haste.", "ka"],
  ["Ripple", "When you cast this spell, you may reveal that many cards from the top of your library. You may cast any with the same name without paying their mana costs. Put the rest on the bottom.", "ka"],
  ["Saddle", "Tap any number of other untapped creatures you control with total power N or more: this Mount becomes saddled until end of turn. Only when you could cast a sorcery.", "ka"],
  ["Scavenge", "Pay the scavenge cost and exile this card from your graveyard: put +1/+1 counters equal to its power on target creature. Only when you could cast a sorcery.", "ka"],
  ["Shadow", "Can block or be blocked only by creatures with shadow.", "ka"],
  ["Shroud", "Can't be the target of any spells or abilities, including your own.", "ka"],
  ["Skulk", "Can't be blocked by creatures with greater power.", "ka"],
  ["Soulbond", "You may pair this creature with another unpaired creature when either enters. They stay paired while you control both, and both get the listed bonus.", "ka"],
  ["Soulshift", "When this creature dies, you may return target Spirit card with mana value N or less from your graveyard to your hand.", "ka"],
  ["Spectacle", "You may cast this spell for its spectacle cost if an opponent lost life this turn.", "ka"],
  ["Splice", "As you cast a spell of the stated kind (like Arcane), you may reveal this card from your hand and pay its splice cost to add its effects to that spell. The card stays in your hand.", "ka"],
  ["Spree", "Choose one or more modes. Pay the extra cost shown with a + for each mode you choose.", "ka"],
  ["Squad", "As you cast this, you may pay the squad cost any number of times. When it enters, create that many token copies of it.", "ka"],
  ["Start your engines!", "If you have no speed, it starts at 1. Once during each of your turns, when an opponent loses life, your speed goes up by 1 (up to 4).", "ka"],
  ["Station", "Tap another untapped creature you control: put charge counters equal to its power on this Spacecraft. Only when you could cast a sorcery. It gets the abilities shown once it has enough counters.", "ka"],
  ["Sunburst", "This enters with a +1/+1 counter (a charge counter if it isn't a creature) for each color of mana spent to cast it.", "ka"],
  ["Surge", "You may cast this for its surge cost if you or a teammate has cast another spell this turn.", "ka"],
  ["Tiered", "Choose one mode as you cast this spell and pay its extra cost.", "ka"],
  ["Transfigure", "Pay the transfigure cost and sacrifice this creature: search your library for a creature card with the same mana value and put it onto the battlefield. Only when you could cast a sorcery.", "ka"],
  ["Transmute", "Pay the transmute cost and discard this card: search your library for a card with the same mana value, reveal it, and put it into your hand. Only when you could cast a sorcery.", "ka"],
  ["Tribute", "As this enters, an opponent of your choice may put that many +1/+1 counters on it. If they don't, its tribute ability happens.", "ka"],
  ["Typecycling", "Landcycling, swampcycling and the like: pay the cost and discard this card to search your library for a card of that type, reveal it, and put it into your hand.", "ka"],
  ["Umbra armor", "If the enchanted permanent would be destroyed, instead remove all damage from it and destroy this Aura. (Older cards call it totem armor.)", "ka"],
  ["Undaunted", "This spell costs {1} less to cast for each opponent you have.", "ka"],
  ["Unleash", "You may have this creature enter with a +1/+1 counter. It can't block as long as it has a +1/+1 counter on it.", "ka"],
  ["Vanishing", "This enters with that many time counters. At the beginning of your upkeep, remove one. When the last is removed, sacrifice it.", "ka"],
  ["Warp", "You may cast this from your hand for its warp cost. At the beginning of the next end step, exile it. You may cast it from exile on a later turn.", "ka"],
  // Keyword actions
  ["Activate", "Put an activated ability on the stack and pay its cost.", "kx"],
  ["Adapt", "If this creature has no +1/+1 counters on it, put that many +1/+1 counters on it.", "kx"],
  ["Attach", "Move an Aura, Equipment, or Fortification onto another object.", "kx"],
  ["Bolster", "Choose a creature with the least toughness among creatures you control and put that many +1/+1 counters on it.", "kx"],
  ["Cast", "Move a spell from where it is (usually your hand) onto the stack and pay its costs.", "kx"],
  ["Clash", "You and an opponent each reveal the top card of your library. You win if yours has the higher mana value. Each player may put their card on the bottom.", "kx"],
  ["Cloak", "Put a card onto the battlefield face down as a 2/2 creature with ward {2}. You can turn it face up any time for its mana cost if it's a creature card.", "kx"],
  ["Collect evidence", "Exile cards with total mana value N or more from your graveyard.", "kx"],
  ["Convert", "Turn a double-faced Transformers card over to its other face.", "kx"],
  ["Counter", "Cancel a spell or ability on the stack. A countered spell goes to its owner's graveyard without doing anything.", "kx"],
  ["Create", "Put a token onto the battlefield.", "kx"],
  ["Destroy", "Move a permanent from the battlefield to its owner's graveyard. Indestructible and regeneration can stop it.", "kx"],
  ["Detain", "Until your next turn, the detained permanent can't attack or block and its activated abilities can't be activated.", "kx"],
  ["Discard", "Move a card from your hand to your graveyard.", "kx"],
  ["Discover", "Exile cards from the top of your library until you exile a nonland card with mana value N or less. Cast it without paying its mana cost, or put it into your hand. Put the rest on the bottom in a random order.", "kx"],
  ["Double", "Doubling power gives +X/+0 where X is its power; doubling counters puts that many more; doubling life or mana gives that much more.", "kx"],
  ["Endure", "Put that many +1/+1 counters on this creature, or create an N/N white Spirit creature token.", "kx"],
  ["Exchange", "Swap two things, like control of two permanents or two life totals. If one part can't happen, none of it does.", "kx"],
  ["Exert", "An exerted creature won't untap during your next untap step.", "kx"],
  ["Fateseal", "Look at that many cards from the top of an opponent's library. Put any number on the bottom and the rest back on top in any order.", "kx"],
  ["Fight", "Two creatures each deal damage equal to their power to the other.", "kx"],
  ["Forage", "Exile three cards from your graveyard, or sacrifice a Food.", "kx"],
  ["Incubate", "Create an Incubator artifact token with that many +1/+1 counters and \"{2}: Transform this.\" It transforms into a 0/0 Phyrexian artifact creature.", "kx"],
  ["Learn", "You may put a Lesson card from outside the game into your hand, or discard a card to draw a card.", "kx"],
  ["Manifest", "Put the top card of your library onto the battlefield face down as a 2/2 creature. If it's a creature card, you can turn it face up any time for its mana cost.", "kx"],
  ["Manifest dread", "Look at the top two cards of your library. Manifest one of them and put the other into your graveyard.", "kx"],
  ["Meld", "Exile two specific cards (a meld pair) and put them onto the battlefield together as one combined permanent.", "kx"],
  ["Monstrosity", "If this creature isn't monstrous, put that many +1/+1 counters on it and it becomes monstrous.", "kx"],
  ["Play", "Play a land, or cast a spell.", "kx"],
  ["Populate", "Create a token that's a copy of a creature token you control.", "kx"],
  ["Regenerate", "The next time this would be destroyed this turn, instead tap it, remove all damage from it, and remove it from combat.", "kx"],
  ["Reveal", "Show a card to all players.", "kx"],
  ["Search", "Look through a zone (usually your library) for a card. If you're looking for a card with a stated quality, you may choose not to find one. Shuffle afterward if told to.", "kx"],
  ["Shuffle", "Put the cards of a library in a random order.", "kx"],
  ["Support", "Put a +1/+1 counter on each of up to that many other target creatures.", "kx"],
  ["Suspect", "A suspected creature has menace and can't block, until something ends it.", "kx"],
  ["Tap", "Turn a permanent sideways to show it's been used. A tapped creature can't attack, block, or pay {T} costs until it untaps.", "kx"],
  ["Time travel", "For each suspended card you own and each permanent you control with a time counter on it, you may add or remove one time counter.", "kx"],
  ["Transform", "Turn a double-faced permanent over to its other face.", "kx"],
  ["Vote", "Each player votes for one of the choices, starting with you and going in turn order.", "kx"],
  // Ability words: no rules meaning of their own; each labels abilities that work alike
  ["Adamant", "A bonus if at least three mana of one color was spent to cast this spell.", "aw"],
  ["Addendum", "A bonus if you cast this spell during your main phase.", "aw"],
  ["Alliance", "Abilities that trigger whenever another creature enters under your control.", "aw"],
  ["Battalion", "Abilities that trigger whenever this and at least two other creatures attack.", "aw"],
  ["Bloodrush", "Pay the cost and discard this card: target attacking creature gets the bonus until end of turn.", "aw"],
  ["Celebration", "A bonus if two or more nonland permanents entered under your control this turn.", "aw"],
  ["Channel", "Pay the cost and discard this card from your hand for an effect.", "aw"],
  ["Chroma", "Counts the colored mana symbols among the stated cards or permanents.", "aw"],
  ["Cohort", "Tap this and an untapped Ally you control for an effect.", "aw"],
  ["Constellation", "Abilities that trigger whenever an enchantment enters under your control.", "aw"],
  ["Converge", "Counts the colors of mana spent to cast this spell.", "aw"],
  ["Corrupted", "A bonus if an opponent has three or more poison counters.", "aw"],
  ["Council's dilemma", "Each player votes, and the effect happens once for each vote for each choice.", "aw"],
  ["Coven", "A bonus if you control three or more creatures with different powers.", "aw"],
  ["Delirium", "A bonus if there are four or more card types among cards in your graveyard.", "aw"],
  ["Descend", "Descend 4 or 8: a bonus if there are that many permanent cards in your graveyard. \"You descended\" means a permanent card went to your graveyard this turn.", "aw"],
  ["Domain", "Counts the basic land types among lands you control.", "aw"],
  ["Eerie", "Abilities that trigger whenever an enchantment enters under your control and whenever you fully unlock a Room.", "aw"],
  ["Eminence", "Abilities that work while your commander is in the command zone or on the battlefield.", "aw"],
  ["Enrage", "Abilities that trigger whenever this creature is dealt damage.", "aw"],
  ["Fateful hour", "A bonus if you have 5 or less life.", "aw"],
  ["Fathomless descent", "Counts the permanent cards in your graveyard.", "aw"],
  ["Ferocious", "A bonus if you control a creature with power 4 or greater.", "aw"],
  ["Flurry", "Abilities that trigger whenever you cast your second spell each turn.", "aw"],
  ["Formidable", "A bonus if creatures you control have total power 8 or greater.", "aw"],
  ["Grandeur", "Discard another card with the same name as this permanent for an effect.", "aw"],
  ["Hellbent", "A bonus if you have no cards in hand.", "aw"],
  ["Heroic", "Abilities that trigger whenever you cast a spell that targets this creature.", "aw"],
  ["Imprint", "This permanent exiles a card, and its other abilities refer to the exiled card.", "aw"],
  ["Inspired", "Abilities that trigger whenever this creature becomes untapped.", "aw"],
  ["Join forces", "Starting with you, each player may pay any amount of mana, and the effect counts the total paid.", "aw"],
  ["Kinship", "At the beginning of your upkeep, you may look at the top card of your library. If it shares a creature type with this, you may reveal it for the effect.", "aw"],
  ["Lieutenant", "A bonus if you control your commander.", "aw"],
  ["Magecraft", "Abilities that trigger whenever you cast or copy an instant or sorcery spell.", "aw"],
  ["Metalcraft", "A bonus if you control three or more artifacts.", "aw"],
  ["Morbid", "A bonus if a creature died this turn.", "aw"],
  ["Pack tactics", "Abilities that trigger when this attacks, if you attacked with creatures with total power 6 or greater this combat.", "aw"],
  ["Paradox", "Abilities that trigger whenever you cast a spell from anywhere other than your hand.", "aw"],
  ["Parley", "Each player reveals the top card of their library, and the effect counts the nonland cards revealed.", "aw"],
  ["Radiance", "Affects the target and each other permanent that shares a color with it.", "aw"],
  ["Raid", "A bonus if you attacked this turn.", "aw"],
  ["Rally", "Abilities that trigger whenever this or another Ally enters under your control.", "aw"],
  ["Revolt", "A bonus if a permanent you controlled left the battlefield this turn.", "aw"],
  ["Secret council", "Each player secretly votes, then all votes are revealed at once.", "aw"],
  ["Spell mastery", "A bonus if there are two or more instant and/or sorcery cards in your graveyard.", "aw"],
  ["Strive", "This spell costs more for each target beyond the first.", "aw"],
  ["Survival", "Abilities that trigger at the beginning of your second main phase if this creature is tapped.", "aw"],
  ["Sweep", "Return any number of lands of the stated type to your hand, and the effect counts them.", "aw"],
  ["Tempting offer", "Each opponent may also get the effect. You get it again for each opponent who does.", "aw"],
  ["Threshold", "A bonus if there are seven or more cards in your graveyard.", "aw"],
  ["Undergrowth", "Counts the creature cards in your graveyard.", "aw"],
  ["Valiant", "Abilities that trigger whenever this creature becomes the target of a spell or ability you control for the first time each turn.", "aw"],
  ["Void", "A bonus if a nonland permanent left the battlefield this turn or a spell was warped this turn.", "aw"],
  ["Will of the council", "Each player votes, and the choice with the most votes (or a tie) decides the effect.", "aw"],
  // Game basics
  ["Ability", "Text on a card that does something. Activated abilities have a cost and a colon, triggered abilities start with when, whenever or at, and static abilities are always on.", "game"],
  ["Static ability", "An ability that's simply true while the card is on the battlefield (or wherever it works), like \"Creatures you control get +1/+1.\"", "game"],
  ["Mana ability", "An ability that adds mana, like a land's {T}: Add {G}. It doesn't use the stack and can't be responded to.", "game"],
  ["Mana", "What you pay for spells and abilities, mostly from lands. Unused mana empties from your mana pool at the end of each step and phase.", "game"],
  ["Mana cost", "The mana symbols in a card's top right corner: what you pay to cast it.", "game"],
  ["Generic mana", "A number in a cost, like {2}: it can be paid with mana of any type.", "game"],
  ["Hybrid mana", "A split symbol, like {G/U}: pay it with either color. {2/W} can be paid with {2} or {W}.", "game"],
  ["Phyrexian mana", "A symbol with a stroke, like {G/P}: pay it with that color or with 2 life.", "game"],
  ["X", "A number you choose as you cast the spell or activate the ability, then pay for. X is 0 everywhere except on the stack.", "game"],
  ["Permanent", "A card or token on the battlefield: artifacts, battles, creatures, enchantments, lands and planeswalkers.", "game"],
  ["Spell", "A card (or copy) on the stack while it's being cast. Once it resolves, a permanent spell becomes a permanent.", "game"],
  ["Target", "The word target means you choose the object or player as you cast the spell or put the ability on the stack. If every target is gone or illegal when it resolves, it does nothing.", "game"],
  ["Owner", "The player whose deck a card started in (or who made a token). Cards always go to their owner's hand, library or graveyard.", "game"],
  ["Controller", "The player who currently controls a permanent, spell or ability. Usually its owner, unless an effect takes control.", "game"],
  ["Hand", "The cards you hold. Your maximum hand size is seven: at the end of your turn, discard down to seven.", "game"],
  ["Zone", "A place cards can be: library, hand, battlefield, graveyard, stack, exile, and the command zone.", "game"],
  ["Draw", "Put the top card of your library into your hand. A player who has to draw from an empty library loses the next time anyone would get priority.", "game"],
  ["Life", "Each player starts with 20 (40 in Commander). A player at 0 or less life loses.", "game"],
  ["Damage", "Damage to a creature stays until the end of the turn; it's destroyed when the damage is at least its toughness. Damage to a player makes them lose that much life.", "game"],
  ["Power and toughness", "The two numbers on a creature, like 3/2: power is the damage it deals in combat, toughness is how much damage destroys it.", "game"],
  ["Dies", "Is put into a graveyard from the battlefield (said of creatures and planeswalkers).", "game"],
  ["Leaves the battlefield", "Moves from the battlefield to any other zone: dying, being exiled, bounced to a hand, and so on.", "game"],
  ["Land drop", "You may play one land on each of your turns, during a main phase, when the stack is empty.", "game"],
  ["Basic land", "Plains, Island, Swamp, Mountain, Forest and Wastes. A deck can have any number of them.", "game"],
  ["Creature", "A permanent that can attack and block. It can't attack (or use {T} abilities) the turn it comes under your control unless it has haste.", "game"],
  ["Artifact", "A colorless-by-default permanent type, like mana rocks and Equipment.", "game"],
  ["Enchantment", "A permanent type with ongoing effects. Auras are enchantments attached to something.", "game"],
  ["Aura", "An enchantment that's cast targeting what it will enchant, and stays attached to it. If what it's attached to leaves, the Aura goes to the graveyard.", "game"],
  ["Equipment", "An artifact you attach to a creature you control with its equip ability. It stays on the battlefield if the creature leaves.", "game"],
  ["Vehicle", "An artifact that becomes an artifact creature when you crew it.", "game"],
  ["Saga", "An enchantment that gets a lore counter as it enters and after your draw step; each chapter triggers when its number is reached, then it's sacrificed after the last.", "game"],
  ["Battle", "A permanent that enters with defense counters. Siege battles are protected by an opponent; attack it and remove all its defense counters to defeat it and cast its back face.", "game"],
  ["Kindred", "A card type for non-creature cards that have creature types, like Kindred Instant (formerly called tribal).", "game"],
  ["Double-faced card", "A card with a face on each side. It enters with its front face up unless an effect says otherwise; transforming turns it over.", "game"],
  ["Modal double-faced card", "A double-faced card you can play as either face, like a spell on the front and a land on the back.", "game"],
  ["Split card", "One card with two spells on it. Choose one half to cast (or both, with fuse).", "game"],
  ["Adventure", "A card with a smaller spell in a box. Cast the Adventure, then it's exiled, and you may later cast the creature or permanent from exile.", "game"],
  ["Face down", "A face-down permanent is a 2/2 creature with no name, text, or color. Its controller may look at it.", "game"],
  ["Copy", "A copy has the original's printed text and copy effects, but not its counters, damage, or whether it's tapped.", "game"],
  ["Emblem", "A marker in the command zone with an ability that lasts all game, usually from a planeswalker. It can't be removed.", "game"],
  ["Replacement effect", "An effect that says \"instead\" or \"as\": it changes what an event does before it happens, without using the stack.", "game"],
  ["Additional cost", "A cost you pay on top of the mana cost, like sacrificing a creature.", "game"],
  ["Alternative cost", "A different cost you pay instead of the mana cost, like flashback or dash. You can use only one.", "game"],
  ["Roll a die", "Roll the stated die (d6, d20...). Results that say \"Visit\" or are on a table on the card tell you what happens.", "game"],
  // Turns and combat
  ["Turn", "Each turn has five phases: beginning (untap, upkeep, draw), first main, combat, second main, and ending (end step, cleanup).", "turn"],
  ["Active player", "The player whose turn it is. When several players would do something at once, the active player goes first, then the others in turn order.", "turn"],
  ["Untap step", "The first step of your turn: untap your permanents. No one gets priority, so nothing can be cast.", "turn"],
  ["Beginning of combat", "The first step of combat. \"At the beginning of combat\" abilities trigger here, before attackers are chosen.", "turn"],
  ["Declare attackers", "The active player chooses which untapped creatures attack and which player, planeswalker or battle each attacks. Attacking taps them unless they have vigilance.", "turn"],
  ["Declare blockers", "Each defending player chooses which of their untapped creatures block which attackers. One blocker can block one attacker; an attacker can be blocked by several.", "turn"],
  ["Unblocked", "An attacking creature that wasn't blocked. It deals its combat damage to the player, planeswalker or battle it's attacking.", "turn"],
  ["Combat damage step", "Attacking and blocking creatures deal damage equal to their power at the same time (first strike and double strike add an earlier damage step).", "turn"],
  ["End of combat", "The last step of combat. Creatures stop being attacking and blocking after it.", "turn"],
  ["Cleanup step", "At the end of the turn, discard down to your maximum hand size, then damage wears off and \"until end of turn\" effects end.", "turn"],
  ["Extra turn", "A turn taken right after the current one. If several are added, the most recently added is taken first.", "turn"],
  ["Until end of turn", "Lasts until the cleanup step of this turn.", "turn"],
  ["Respond", "Cast an instant or activate an ability while something else is on the stack, so yours resolves first.", "turn"],
  // Commander and multiplayer
  ["Commander", "A legendary creature (or a card that says it can be your commander) that leads a 100-card singleton deck. It starts in the command zone, and you can cast it from there.", "cmdr"],
  ["Command zone", "Where commanders, emblems and similar things live outside the game. If your commander would go to your graveyard or exile (or your hand or library), you may move it back to the command zone.", "cmdr"],
  ["Color identity", "Every color in a card's mana cost and rules text. A Commander deck can contain only cards within its commander's color identity.", "cmdr"],
  ["Singleton", "Only one copy of each card, except basic lands (and cards that say a deck can have any number of them). Commander decks are singleton.", "cmdr"],
  ["Partner with", "When this enters, target player may search their library for the named partner and put it into their hand. The two can be your commanders together.", "cmdr"],
  ["Friends forever", "You can have two commanders if both have friends forever.", "cmdr"],
  ["Choose a Background", "You can have a Background enchantment as a second commander alongside this one.", "cmdr"],
  ["Doctor's companion", "You can have two commanders if one is a Doctor and the other has doctor's companion.", "cmdr"],
  ["Commander Brackets", "A 1 to 5 scale for how strong a Commander deck is: 1 Exhibition, 2 Core, 3 Upgraded, 4 Optimized, 5 cEDH. Game Changers, a short list of very strong cards, put a deck at bracket 3 or higher.", "cmdr"],
  ["Game Changers", "A short official list of very strong Commander cards. Brackets 1 and 2 have none, bracket 3 allows up to three.", "cmdr"],
  ["Rule 0", "The talk before a game about what kind of game everyone wants: power level, house rules, proxies.", "cmdr"],
  ["Range of influence", "In some multiplayer games, a player only affects players within a set distance. Commander normally uses no limit.", "cmdr"],
  ["Leaving the game", "When a player loses in a multiplayer game, everything they own leaves the game and spells and abilities they control end.", "cmdr"],
  // Tokens and counters
  ["+1/+1 counter", "Gives the creature +1/+1. A +1/+1 counter and a -1/-1 counter on the same permanent remove each other.", "tok"],
  ["-1/-1 counter", "Gives the creature -1/-1. It cancels out with a +1/+1 counter on the same permanent.", "tok"],
  ["Shield counter", "If a permanent with a shield counter would be dealt damage or destroyed, remove a shield counter instead.", "tok"],
  ["Stun counter", "If a permanent with a stun counter would become untapped, remove a stun counter instead.", "tok"],
  ["Lore counter", "Counts a Saga's chapters. One is added as it enters and after your draw step.", "tok"],
  ["Time counter", "Used by suspend, vanishing and impending. Removing the last one usually makes something happen.", "tok"],
  ["Charge counter", "A general-purpose counter many artifacts use to track uses or power.", "tok"],
  ["Experience counter", "Counters a player gets; cards that care about them grow stronger as you get more.", "tok"],
  ["Rad counter", "At the beginning of your precombat main phase, mill a card for each rad counter you have. For each nonland card milled this way, lose 1 life and remove a rad counter.", "tok"],
  ["Blood", "An artifact token with \"{1}, {T}, Discard a card, Sacrifice this: Draw a card.\"", "tok"],
  ["Map", "An artifact token with \"{1}, {T}, Sacrifice this: Target creature you control explores. Activate only as a sorcery.\"", "tok"],
  ["Powerstone", "An artifact token with \"{T}: Add {C}. This mana can't be spent to cast nonartifact spells.\"", "tok"],
  ["Gold", "An artifact token with \"Sacrifice this: Add one mana of any color.\"", "tok"],
  ["Junk", "An artifact token with \"{T}, Sacrifice this: Exile the top card of your library. You may play that card this turn. Activate only as a sorcery.\"", "tok"],
  ["Role", "An Aura token (Monster, Royal, Wicked, Cursed, Sorcerer, Young Hero, Virtuous). A creature can have only one Role from each player.", "tok"],
  ["Incubator", "An artifact token with \"{2}: Transform this artifact.\" It becomes a 0/0 Phyrexian artifact creature with its +1/+1 counters.", "tok"],
  ["Speed", "A number a player has (from start your engines!), from 1 to 4. It goes up once per turn when an opponent loses life on your turn.", "tok"],
  // Player talk
  ["Bounce", "Return a permanent to its owner's hand.", "slang"],
  ["Blink", "Exile a permanent and return it to the battlefield, often to reuse its enters ability. Also called flicker.", "slang"],
  ["Burn", "Spells that deal damage directly, like Lightning Bolt.", "slang"],
  ["Card advantage", "Having more useful cards than your opponents, usually from drawing extra cards or trading one card for several.", "slang"],
  ["Chump block", "Block with a creature that will die without killing the attacker, to save life.", "slang"],
  ["Combo", "Two or more cards that together win the game or do something huge, often infinitely.", "slang"],
  ["cEDH", "Competitive Commander: the strongest decks, built to win as fast and reliably as possible.", "slang"],
  ["EDH", "Another name for Commander (from Elder Dragon Highlander).", "slang"],
  ["Fixing", "Cards that make mana of colors you need, like dual lands and Arcane Signet.", "slang"],
  ["Mana screw", "Not drawing enough lands. Mana flood is drawing too many.", "slang"],
  ["Precon", "A preconstructed deck, sold ready to play.", "slang"],
  ["Proxy", "A stand-in for a card you don't own. Fine in casual games if everyone agrees.", "slang"],
  ["Reanimate", "Return a creature card from a graveyard to the battlefield.", "slang"],
  ["Removal", "Cards that destroy, exile, or otherwise deal with an opponent's permanents. Spot removal deals with one.", "slang"],
  ["Stax", "Cards that restrict what players can do, like taxing spells or stopping untaps.", "slang"],
  ["Topdeck", "The top card of your library, or drawing exactly the card you needed.", "slang"],
  ["Value", "Getting more than one card's worth out of a card.", "slang"],
  ["Voltron", "A deck that piles Auras and Equipment onto one creature (often the commander) to win with commander damage.", "slang"],
  ["Wincon", "Win condition: how a deck plans to win.", "slang"]
];

/* The groups the Terms list can be filtered by, and the group of each term in KT_KEYWORDS above */
window.KT_TERM_CATS = { ka:"Keyword abilities", kx:"Keyword actions", aw:"Ability words", game:"Game basics", turn:"Turns and combat",
  cmdr:"Commander", tok:"Tokens and counters", slang:"Player talk" };
window.KT_KEYWORD_CAT = (() => {
  const g = {
    kx:["Scry", "Surveil", "Mill", "Proliferate", "Investigate", "Equip", "Connive", "Explore", "Amass", "Goad", "Venture into the dungeon",
      "The Ring tempts you", "Sacrifice", "Untap", "Exile", "Crew"],
    aw:["Landfall"],
    cmdr:["Partner", "Commander tax", "Monarch", "Initiative", "Commander damage"],
    tok:["Treasure", "Food", "Clue", "Energy", "Poison", "Token", "Loyalty"],
    game:["Mana value", "Graveyard", "Library", "Battlefield", "The stack", "Mulligan", "Enters the battlefield", "ETB", "Priority", "Instant",
      "Sorcery", "Legendary", "Colorless", "Triggered ability", "Activated ability", "Planeswalker", "Day and night"],
    turn:["Upkeep", "Draw step", "End step", "Combat damage", "Summoning sickness", "Main phase"],
    slang:["Counterspell", "Board wipe", "Ramp", "Tutor", "Mana rock", "Mana dork"]
  };
  const out = {}; for (const [c, names] of Object.entries(g)) for (const n of names) out[n] = c;
  return out;  // (anything not listed is a keyword ability)
})();
// Every term with its group, one entry per name: [{ name, def, cat }]
window.KT_allTerms = () => {
  const seen = new Map();
  for (const [name, def] of window.KT_KEYWORDS) seen.set(name.toLowerCase(), { name, def, cat:window.KT_KEYWORD_CAT[name] || "ka" });
  for (const [name, def, cat] of window.KT_GLOSSARY) if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), { name, def, cat });
  return [...seen.values()];
};

/* The Terms list, shared by both tables: a search box (names first, then words in the meanings), filters by group,
   an A to Z bar to jump around, and every term with its meaning right there (no clicking to open). Returns
   { el, setQuery(text) }; el goes in a modal (digital table) or the Terms tab (webcam table). */
window.KT_termsUI = (opts = {}) => {
  if (!document.getElementById("ktt-style")) {
    const st = document.createElement("style"); st.id = "ktt-style";
    st.textContent = `
.ktt{display:flex;flex-direction:column;gap:8px;min-height:0}
.ktt-search{width:100%;box-sizing:border-box;padding:9px 12px;border-radius:8px;border:1px solid var(--felt-edge,#244a42);background:rgba(0,0,0,.25);color:inherit;font:inherit;font-size:15px}
.ktt-cats{display:flex;flex-wrap:wrap;gap:6px}
.ktt-cats button{border:1px solid var(--felt-edge,#244a42);background:rgba(0,0,0,.2);color:inherit;border-radius:999px;padding:4px 10px;font:inherit;font-size:12.5px;cursor:pointer}
.ktt-cats button[aria-pressed="true"]{background:var(--brass,#c9a44c);border-color:var(--brass,#c9a44c);color:#1b1608;font-weight:700}
.ktt-cats button span{opacity:.7;margin-left:4px}
.ktt-az{display:flex;flex-wrap:wrap;gap:2px}
.ktt-az button{border:0;background:none;color:var(--brass,#c9a44c);font:inherit;font-size:12.5px;font-weight:700;padding:2px 5px;border-radius:4px;cursor:pointer;min-width:22px}
.ktt-az button:hover{background:rgba(255,255,255,.08)}
.ktt-az button:disabled{color:var(--muted,#a9b8ae);opacity:.35;cursor:default}
.ktt-count{margin:0;font-size:12.5px;color:var(--muted,#a9b8ae)}
.ktt-list{display:flex;flex-direction:column}
.ktt-letter{margin:10px 0 2px;font-size:13px;color:var(--brass,#c9a44c);border-bottom:1px solid var(--felt-edge,#244a42);padding-bottom:2px;scroll-margin-top:8px}
.ktt-item{padding:7px 2px;border-bottom:1px solid rgba(255,255,255,.06)}
.ktt-name{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.ktt-name b{font-size:15px}
.ktt-tag{font-size:11px;color:var(--muted,#a9b8ae);border:1px solid var(--felt-edge,#244a42);border-radius:999px;padding:0 7px}
.ktt-def{margin:3px 0 0;font-size:14px;line-height:1.45}
.ktt mark{background:rgba(201,164,76,.35);color:inherit;border-radius:2px;padding:0 1px}
.ktt-none{margin:8px 0;color:var(--muted,#a9b8ae)}`;
    document.head.appendChild(st);
  }
  const CATS = window.KT_TERM_CATS, mk = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; };
  const all = window.KT_allTerms().sort((a, b) => a.name.localeCompare(b.name));
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9+/ -]/g, "").replace(/\s+/g, " ").trim();
  let cat = "", q = "";
  const search = mk("input", { type:"search", className:"ktt-search", placeholder:`Search ${all.length} terms: a name, or what it does ("can't be blocked")`, autocomplete:"off" });
  search.setAttribute("aria-label", "Search Magic terms");
  const cats = mk("div", { className:"ktt-cats" }), az = mk("div", { className:"ktt-az" }), count = mk("p", { className:"ktt-count" }), list = mk("div", { className:"ktt-list" });
  cats.setAttribute("role", "group"); cats.setAttribute("aria-label", "Show terms from");
  az.setAttribute("aria-label", "Jump to a letter");
  // (the search word, bolded where it appears)
  const marked = (text, word) => {
    if (!word) return [text];
    const i = text.toLowerCase().indexOf(word); if (i < 0) return [text];
    return [text.slice(0, i), mk("mark", { textContent:text.slice(i, i + word.length) }), text.slice(i + word.length)];
  };
  const item = (t, word) => mk("div", { className:"ktt-item" },
    mk("div", { className:"ktt-name" }, mk("b", {}, ...marked(t.name, word)), mk("span", { className:"ktt-tag", textContent:CATS[t.cat] || "" })),
    mk("p", { className:"ktt-def" }, ...marked(t.def, word)));
  const draw = () => {
    const inCat = cat ? all.filter(t => t.cat === cat) : all;
    cats.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.cat === cat)));
    list.replaceChildren(); az.replaceChildren();
    if (q) {
      // Ranked: the name itself, names starting with it, a word in the name starting with it, then meanings that mention it
      // (and, if nothing matches, the word without an ending: "blocked" finds "block")
      const rank = w => inCat.map(t => {
        const n = norm(t.name), d = norm(t.def);
        const r = n === w ? 0 : n.startsWith(w) ? 1 : n.split(/[ -]/).some(x => x.startsWith(w)) ? 2 : n.includes(w) ? 3 : d.includes(w) ? 4 : 9;
        return [r, t];
      }).filter(([r]) => r < 9).sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
      let w = q, hits = rank(w);
      for (const stem of [q.replace(/ie[sd]$/, "y"), q.replace(/ing$/, "e"), q.replace(/(es|ed|ing|s|d)$/, "")]) {
        if (hits.length || stem === q || stem.length < 3) continue;
        w = stem; hits = rank(w);
      }
      if (!hits.length) w = q;
      count.textContent = `${hits.length} term${hits.length === 1 ? "" : "s"} for "${search.value.trim()}"${cat ? ` in ${CATS[cat]}` : ""}`;
      if (!hits.length) list.append(mk("p", { className:"ktt-none", textContent:"No term matches. Try a shorter word, or another group." }));
      list.append(...hits.map(([, t]) => item(t, w)));
      return;
    }
    count.textContent = `${inCat.length} ${cat ? CATS[cat].toLowerCase() : "terms"}, A to Z`;
    const letters = new Map();
    for (const t of inCat) { const L = /[a-z]/i.test(t.name[0]) ? t.name[0].toUpperCase() : "#"; (letters.get(L) || letters.set(L, []).get(L)).push(t); }
    for (const L of ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]) {
      const b = mk("button", { type:"button", textContent:L, disabled:!letters.has(L) });
      b.setAttribute("aria-label", L === "#" ? "Symbols" : `Terms starting with ${L}`);
      if (L === "#" && !letters.has(L)) continue;
      b.onclick = () => list.querySelector(`[data-letter="${L}"]`)?.scrollIntoView({ block:"start", behavior:"smooth" });
      az.append(b);
    }
    for (const [L, ts] of letters) { const h = mk("h3", { className:"ktt-letter", textContent:L }); h.dataset.letter = L; list.append(h, ...ts.map(t => item(t, ""))); }
  };
  const chip = (key, label, n) => { const b = mk("button", { type:"button" }, label, mk("span", { textContent:n })); b.dataset.cat = key; b.onclick = () => { cat = key; draw(); }; return b; };
  cats.append(chip("", "All", all.length), ...Object.entries(CATS).map(([k, label]) => chip(k, label, all.filter(t => t.cat === k).length)));
  search.oninput = () => { q = norm(search.value); draw(); };
  draw();
  return { el:mk("div", { className:"ktt" }, search, cats, az, count, list), search,
    setQuery(text){ search.value = text; q = norm(text); draw(); } };
};
