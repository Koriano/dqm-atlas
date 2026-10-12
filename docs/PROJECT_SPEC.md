# Project Specification — DQM Atlas

What the application does and why. How it is built is in [ARCHITECTURE.md](./ARCHITECTURE.md), the shape of the
game data in [DATA_MODEL.md](./DATA_MODEL.md), where that data comes from in [DATA_SOURCING.md](./DATA_SOURCING.md).

## 1. Vision

DQM Atlas is a visual atlas of the monsters and synthesis paths of the Dragon Quest Monsters games. It serves two
needs:

- **Explore**: browse every monster of a game, with its icon, family and rank.
- **Solve**: pick a monster and work out, step by step, how to obtain it.

It is an unofficial fan site: free, without ads or donations, without accounts, and with nothing stored on a server.

## 2. Scope of V1

### Game

- **Dragon Quest Monsters: Joker 2, original version.** DQMJ2 Professional is a different game with different
  monsters and rules: its data must never be mixed in.
- 311 monsters, 8 families (one of them `???`), ranks F to X plus `???`.

The game selector also lists the planned games, disabled, after the available ones (each group in release order):
Joker, Joker 2 Professional, Terry's Wonderland 3D, Joker 3, Joker 3 Professional, The Dark Prince, The Withered
World.

### Not in V1

- Accounts, backend, remote database, anything saved in the browser.
- Automatic synthesis planner, shortest path, player inventory.
- Search by family, rank or stats.
- Languages other than French and English.

## 3. Screens

The page has a header, a main canvas and two panels.

- **Header**: title and game selector on the left, monster search in the centre, "What's new", language and "About"
  on the right.
- **Canvas**: the atlas, or the synthesis tree of the opened monster.
- **Left panel**: which relations the tree shows (parents, children) and how deep.
- **Right panel**: the sheet of the selected monster.

Under 900 px the canvas keeps the whole screen: the left panel becomes a drawer opened by a floating button, and the
sheet becomes a bottom sheet shown while a tree is open.

### Atlas

Every monster of the game, without any link: families as columns, ranks as rows, positions stable from one visit to
the next. Pan and zoom. Selecting a monster opens its tree.

### Synthesis tree

The opened monster is the root. Its ancestors (how to obtain it) are drawn above it, its descendants (what it helps
to make) below.

- Clicking a monster of the tree opens its sheet; it never rebuilds the tree. Only the atlas, the search and the
  sheet's "View" button open a new tree.
- For the root and each ancestor, the sheet chooses how **that occurrence** is obtained: one of its recipes, a normal
  synthesis, a scouting location or an event. A monster appearing several times keeps one choice per occurrence.
- A scouted or event monster ends its branch, and its node carries a tag ("Recruitable", "Event").
- Without an explicit choice, the root uses its representative synthesis (section 4); an ancestor uses its first
  scouting location, then its representative synthesis, then its first event.
- Descendants are read-only.
- The parent depth set in the left panel is a hard limit, explicit choices included. It is also what ends recipes
  that need each other.
- A "reset" button drops every choice of the tree.

**Parents to pick.** Some parents are not a fixed monster: a recipe's generic parent (a family, possibly with rank
bounds, or a named group of monsters) and the two parents of a normal synthesis. They are drawn as a slot shaped like
a monster node — the family icon when every candidate shares a family, a "?" otherwise. Clicking the slot opens a
search limited to the eligible monsters. The picked monster replaces the slot and becomes a regular ancestor; a
"Change…" field under it picks another monster or empties the slot. Candidates are never all drawn in the tree.

### Monster sheet

- Identity: icon, name, family, rank, size, skill and traits. The skill and each trait open a popover: what the skill
  unlocks at each skill-points threshold, or the trait's in-game description.
- "View": opens a tree rooted on this monster.
- Three tabs, the active one kept from one monster to the next:
  - **Obtainment**: scouting locations (with time of day, weather and story stage when they matter), syntheses
    (each recipe with its parents as icon + name, plus normal synthesis), events.
  - **Stats**: usable equipment, then the six maximum stats with a gauge scaled on the highest value of the game.
  - **Resistances**: every category of the game; one without a stored value is shown as normal, a partial resistance
    with its percentage.

### Search

By monster name only, in every available language at once and ignoring accents, so a monster is found from its
French name in the English interface.

### Sharing

The address names the game and the tree's root (`#/<gameId>/<monsterId>`), so the default tree of a monster can be
linked to. An address naming an unknown game or monster falls back to the atlas.

A customised tree is shared as a text code, exported and imported from buttons next to the zoom controls. The code is
a snapshot of the choice of every displayed monster and of the parent depth. An imported code is never trusted: every
recipe, parent, location and event is checked against the game data, and a single invalid element rejects the whole
code — a tree is never restored in part.

### What's new

A header button lists the changes, written by hand in French and English, one release per day, grouped into
additions and fixes, each release with its age ("3 days ago"). Nothing is pushed to the user: no notification, no
indicator, nothing stored in the browser.

### About

An icon button opens the legal notice: unofficial fan site, free and without ads, not affiliated with Square Enix;
the game's names, texts and images belong to their owners. It links to a feedback form for suggestions and bugs.

## 4. Representative synthesis

When a monster can be made in several ways, the one shown by default is computed, never stored:

1. a four-way recipe;
2. otherwise a special recipe;
3. otherwise normal synthesis.

Within a type, the first recipe in data order wins.

## 5. Languages

French and English. The interface starts in the first supported language of the browser's preferences, English
otherwise. The page title and description follow the language, and the title names the root of the open tree
("Léopold - DQM Atlas").

French wording follows the game: "synthèse", never "fusion".

## 6. Accessibility

Everything is reachable with the keyboard: tree nodes, the sheet's tabs (arrow keys), popovers, dialogs and the
mobile drawer, which keep the focus inside while open and give it back when closed.

## 7. Data quality

The site is only worth what its data is worth.

- Game data is never invented, inferred or completed by analogy. A value that is not verified stays missing.
- A name or description that is not verified in a language is left out, never translated by hand.
- Icons are provided by the project owner; they are never downloaded or generated.

## 8. Later

Ideas, none of them planned in detail: the other games of the selector, a synthesis planner (shortest path, player
inventory), Japanese, monster comparison, offline use.
