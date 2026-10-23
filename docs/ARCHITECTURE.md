# Architecture

How the application is built. What it does is in [PROJECT_SPEC.md](./PROJECT_SPEC.md); the data contract is in
[DATA_MODEL.md](./DATA_MODEL.md).

## Stack

Static Vue 3 application in strict TypeScript, built with Vite and published on GitHub Pages under the base path
`/dqm-atlas/`. No backend, no remote API, no router or store library. The canvases use Vue Flow.

```bash
npm run dev            # Vite dev server
npm run typecheck      # vue-tsc --noEmit
npm run build          # typecheck + vite build → dist/
npm run preview        # serve the built dist/
npm run validate:data  # validate every src/data/<game>/*.json
```

There is no linter and no test runner. Node 22.18 or later is required (`engines` in `package.json`):
`validate:data` runs a TypeScript file directly.

`.github/workflows/deploy.yml` publishes `dist/` on every push to `master` (or manually), after `validate:data` and
`build`: a data error blocks the deployment.

## Layers

```text
Data → Domain → Services → Graph projection → Vue components
```

The flow is one-way.

- **Data** (`src/data/<game>/`): validated JSON facts of one game.
- **Domain** (`src/domain/`): pure types. Ids only, never display names.
- **Services** (`src/services/`): every calculation — synthesis, tree, layouts, search. Framework-free.
- **Graph projection**: the tree and its positions, rebuilt from the state whenever it changes. It is never the
  source of truth.
- **Components** (`src/components/`): presentation and interaction. They never implement a game rule and never
  mutate data.

Two rules follow from it:

- **No game is hard-coded outside its data.** Vue code and services only know `GameData`. Ranks, families, the stat
  scale, the resistance categories all come from the loaded game.
- **Names are not ids.** An entity is identified by its stable id; its name is a translation.

What this forbids in practice: `if (game === "dqmj2")` in a component, `monster.name === "Estark"`, a recipe written
in Vue, a synthesis rule inside a click handler.

## Source tree

```text
src/
├── app/          App.vue (shell), context.ts (state), route.ts (address), preload.ts (images), styles.css
├── components/
│   ├── layout/   header, relations panel, "What's new" and "About" buttons
│   ├── graph/    AtlasCanvas, FocusCanvas, its viewport and parent picker, TreeShareControls
│   ├── monster/  detail panel, its tabs, obtainment cards
│   └── common/   combobox, dialog, icons, loading indicator, popover, tags, labels, focus and text-measuring helpers
├── domain/       monster.ts, synthesis.ts, game.ts
├── services/
│   ├── synthesis/  engine, recipe matching, normal-synthesis strategies
│   ├── graph/      focusTree, focusGraph, focusLayout, atlasLayout, treeCode
│   └── assets.ts, search.ts, stats.ts
├── data/         index.ts (game registry) and one folder per game
├── i18n/         <lang>.json (app text), <gameId>/<lang>.json (entity names)
└── changelog/    one JSON file per release
scripts/          validate-data.ts, data-schema.ts
public/assets/<game>/{monsters,families,equipment}/
```

## State

`src/app/context.ts` creates one application context, provided by `App.vue` and read with `useAppContext()`.

State:

- active game and language;
- `tree`: `{ rootId, choices, selectedId }`, or `null` while the atlas is shown;
- show parents / children and their depth;
- left panel open or not;
- `detailExpanded`, the sheet full or reduced to its heading, kept from one node to the next;
- `detailTab`, the sheet's tab, kept from one node to the next;
- `sheetSize`, the size the sheet shows, kept the same way (null: each monster in its own size).

Derived from it: the loaded `GameData`, `monsters` (the one index of its monsters by id), the translated names and UI texts, `searchKeys` (every language, normalised once for search),
`statMaxima` (the highest value of each stat in the game, in any size: the scale of the gauges), the cached synthesis engine,
`ancestryTree` / `descendantTree` / `treeNodes`, and `selectedNode` (its monster, side, whether it is editable, its
resolved choice, its normal-parent options).

Loading a game also loads its monster icons before the atlas is shown (`preload.ts`): `status` stays `loading`
meanwhile and `loadProgress` counts the icons. `common/LoadingIndicator.vue` shows the wait — the task, and its
progress when it can be counted; it is the component for every long wait.

Actions: `openTree`, `selectNode`, `setChoice`, `pickParent`, `resetTree`, `exportTree`, `importTree`.

The game data is never mutated.

## Sheet values

`services/stats.ts` is the one place that computes what the sheet shows for a monster in a size: `sheetStats`
multiplies the stored maximum stats by the size's multipliers (`rules.sizeVariants`) and those of the traits the
monster has in that size (`Trait.sheetEffect`), then rounds once; `sheetResistances` adds their resistance bonuses
to the stored values, a bonus never taking a value above 100 (immune). `resistanceStage` names a value by the stage
it reaches, and `resistanceLevel` gives its colour (weak, normal, resistant, absorb). Components only display the result.

## Synthesis engine

`createSynthesisEngine(game)` in `src/services/synthesis/`:

- `synthesize(a, b)`: what a pair gives;
- `obtainMethods(target)`: every way to make a monster (four-way, special, normal parent pairs);
- `usages(monster)`: what a monster helps to make;
- `conditionCandidates`: the monsters accepted by a generic parent;
- `parentOptions`: the options of one normal-synthesis parent, given the parent picked on the other side;
- `representativeOrigin`: four-way → special → normal, first recipe in data order within a type.

Fixed recipes are stored. **Normal synthesis is computed, never stored**: the engine enumerates every pair of species
once (a lazy index, about 0.3–0.6 s, prepared during browser idle time) and asks a strategy for the candidates. The
strategy is chosen by `rules.normalSynthesis.kind` (`normal/libraryOrder.ts` for DQMJ2, `normal/familyTable.ts` for
The Dark Prince). A strategy says whether the order of the parents matters (`ordered`): the index then holds each
order that works, the first parent of a pair stays the first in the tree, and `parentOptions` keeps each side to its
own place (`orderedParents`).

## Synthesis tree

`src/services/graph/focusTree.ts` builds the tree from the root and the choices.

- A node id is its path: `root`, `root/<index>:<key>/…` for ancestors, `child:…` for descendants. Choices are keyed
  by that path, which is why two occurrences of a monster are independent.
- `NodeChoice` is one of: a recipe (with the monsters picked for its generic parents, `picks[index]`), a normal
  synthesis (`parents`), a scouting location, an egg's region, an event.
- The choices of a replaced branch are kept but unused, so switching back restores them.
- A monster repeated on its own branch is expanded like any other — otherwise it would look obtainable without
  parents. Only the depth limit ends recipes that need each other.
- Descendants only follow stored recipes.
- `MAX_PARENT_DEPTH` is 5 and `MAX_CHILD_DEPTH` 2: on DQMJ2 the worst cases are 187 and 70 nodes.

A parent the user must pick is a `slot` node. `pickParent(slotNodeId, monsterId | null)` writes the pick in the
owner node's choice (`withParentPick` in `focusTree.ts`). For a normal synthesis, the other parent is dropped when the
new pair is not valid.

`src/services/graph/focusGraph.ts` projects that tree into what is drawn: the kind and content of each node, its
size, its position (through `focusLayout.ts`) and the edges. It knows nothing of Vue or Vue Flow. The texts come
from a `FocusLabels` object given by the caller, which also says how many lines a note takes: the component measures
the text in the page's font (`common/textLines.ts`) instead of guessing from its length, which differs from one
language to the next.

## Layouts

Both are plain functions without any framework.

- `atlasLayout.ts`: families as columns, ranks as rows. Each cell stacks its monsters in four columns and reserves
  the height of each size, so icons never overlap. It also returns the row and column dividers, drawn as one SVG
  background node.
- `focusLayout.ts`: each node centred over its own branches, one row per level, never wrapped. Ancestor levels are
  bottom-aligned above the root, descendant levels top-aligned below.

A monster icon is 1, 2 or 3 slots of 40 px high depending on its size (S / M / G). These numbers are defined once,
in `services/assets.ts` (`MONSTER_ICON_SLOT`, `MONSTER_ICON_SLOTS`, `monsterIconSize`).

## Canvases

`AtlasCanvas.vue` and `FocusCanvas.vue` are two Vue Flow instances (`atlas`, `focus`). Selection is read from the
application state, not from Vue Flow. Edges are not interactive.

`FocusCanvas.vue` only draws: it turns the result of `focusGraph` into Vue Flow nodes and edges, and handles the
clicks. Its viewport is `focusViewport.ts` and its parent picker `ParentPicker.vue`.

- The atlas stays mounted (`v-show`) while a tree is open, so it keeps its viewport.
- A new tree is fitted in the view, above the mobile bottom sheet. Once the user has panned or zoomed, later changes
  keep the selected node at the same place on screen instead of refitting. The same holds when the visible area
  changes: the bottom sheet's height, or the canvas width when a side column opens or collapses. Vue Flow emits `nodes-initialized` again
  for every new node, and `move-start` on a plain click: neither can be used as "the user moved".

**Parent picker.** Clicking a slot opens the `MonsterCombobox` in a dialog centred over the dimmed canvas. The field
is not placed inside the node, where it would shrink with the zoom. The dialog must not be centred with a CSS
`transform`, which would capture the list's `position: fixed`.

## Shared components

- `MonsterCombobox.vue`: the only monster search, used by the header and the parent picker. Its list is
  `position: fixed` and flips upwards so the mobile sheet cannot clip it.
- `InfoPopover.vue`: the popover of the skill and traits, opened by hover, focus or tap.
- `MonsterIcon.vue`, `FamilyIcon.vue`: icons. The family icon is cropped to its drawn area (the game's
  `familyIconFrame`) and brought to the same height in every game. Pixel art is kept sharp: a family icon enlarged by a
  whole factor, a monster icon file of one slot (40 px). A larger monster icon file is smoothed.
- `services/assets.ts`: the only place that builds an icon address and knows the icon sizes.
- `labels.ts`: wording of conditions, recipes and scout situations: text lines for a game without seasons, one row of
  seasons per story stage otherwise (the game's icons when it declares them).

The 900 px breakpoint is only written in `App.vue`, which sets the `wide` class on the shell; styles elsewhere use
`.app-shell.wide` / `.app-shell:not(.wide)` instead of their own media query.

## Address and sharing

`src/app/route.ts` reads and writes `#/<gameId>/<monsterId>`; `App.vue` keeps it in sync with the state
(`pushState`, `hashchange`). Every address names its game, the first game's atlas included (`#/dqmj2`). An address
naming nothing, the bare site address among them, is corrected with `replaceState`, so Back does not return to it.

`src/services/graph/treeCode.ts` encodes a tree as `dqm1.` + base64url(deflate-raw(JSON)). The code is a
**snapshot**: the resolved choice of every displayed occurrence, defaults included, plus the parent depth — so a
code does not depend on the default-choice rules. Decoding treats it as untrusted input: every recipe must produce
its monster, every parent must be the recipe's fixed parent or one of the slot's candidates, normal parents must
form a valid pair. One mismatch rejects the whole code.

## Text and languages

- `src/i18n/<lang>.json`: application text and the games' names.
- `src/i18n/<gameId>/<lang>.json`: one section per catalog of `game.json`, plus `monsters`, `abilityDescriptions`
  and `traitDescriptions`, keyed by entity id. Loaded for the active game and language only.
- `src/i18n/index.ts`: `LANGUAGES`, `detectLanguage`, loaders.

`index.html` carries the English title, description and link-preview tags; `App.vue` rewrites the title, the
description and `<html lang>` for the active language. There is no `robots.txt` (ignored outside the host root on a
project site) and no sitemap (one indexable address, since trees live in the `#` part).

## Changelog

`src/changelog/<YYYY-MM-DD>.json` holds the user-facing changes of one release: grouped by kind (`feature`, `fix`),
one sentence per language. `index.ts` collects them, most recent first, with the date read from the file name. They
are only downloaded when the list is opened.

## Focus and keyboard

- Dialogs are native `<dialog>` elements named by their title, all through `common/AppDialog.vue`: a click on the
  backdrop closes one, and Escape closes it without reaching the shell.
- The mobile drawer is modal while open: the header, canvas and sheet are `inert`.
- The parent picker keeps Tab inside and gives the focus back to what opened it, or to the node now filling the slot.
- The sheet's tabs follow the ARIA tabs pattern.
- `common/focus.ts` (`restoreFocus`) gives a focus lost on `<body>` — its element was hidden or removed — to a given
  element, retrying for a few frames because a new graph node is not focusable at once. It is used when a tree opens
  (to its root) or closes (to that monster in the atlas), never on arrival by a link.
- The combobox list is `tabindex="-1"`: a scrollable list is focusable by default and would swallow Tab.

## Data validation

`npm run validate:data` is a development tool: it is not part of `build` and nothing of it ships to the browser.

1. **Shape.** A JSON Schema is generated at run time from the `src/domain/` types (roots in
   `scripts/data-schema.ts`), so the types are the single source of truth. Constraints are added as JSDoc tags on
   the types (`/** @minItems 1 */`).
2. **References.** Ids are unique; every id used by a monster or a recipe is declared in a `game.json` catalog; ranks
   are in `rules.rankOrder`; icon files exist; a trait tied to a size is one the monster can have; resistances are
   values in a game with `resistanceStages` and named in a game without.
3. **Warnings**, not errors: unused catalog entries, missing or unknown translations.

The game JSON is assembled with a cast (`as unknown as GameData`): the compiler does not check its shape, only the
validator does. A passing validation proves the data is consistent, not that it is true to the game.

## Adding a game

1. Add its id to `GameId` and its folder `src/data/<game>/` (`game.json`, `monsters.json`, `recipes.json`,
   `skills.json`, `index.ts`), then register its loader in `src/data/index.ts` and remove it from
   `UPCOMING_GAME_IDS`.
2. Add `src/i18n/<game>/<lang>.json` and its icons under `public/assets/<game>/`.
3. If its normal synthesis works differently, add a `kind` to `NormalSynthesisRule` and a strategy in
   `services/synthesis/normal/`. Recipe matching and reverse lookups are reused as they are.

A version with other monsters or rules (DQMJ2 Professional) is a separate game, with its own folder.

## Adding a synthesis mechanic

Describe the rule in domain terms first: its inputs, its conditions, its result. If the existing types cannot
express it, extend them with a structured variant ([DATA_MODEL.md](./DATA_MODEL.md)), then the engine, then the
tree. A mechanic is only added when a real game needs it.
