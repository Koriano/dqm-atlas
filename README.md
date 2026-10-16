# DQM Atlas

A visual atlas of the monsters and synthesis paths of the Dragon Quest Monsters games: browse every monster of a
game, open one, and work out step by step how to obtain it.

It covers **Dragon Quest Monsters: Joker 2** (original version, not Professional) and **Dragon Quest Monsters: The Dark
Prince**. Other games are planned.

DQM Atlas is an unofficial fan site, free and without ads. It is not affiliated with or endorsed by Square Enix.
Dragon Quest is a trademark of Square Enix; the names, texts and images taken from the game belong to their
respective owners.

## Development

Static Vue 3 + TypeScript application built with Vite and published on GitHub Pages.

```bash
npm install
npm run dev            # dev server
npm run build          # typecheck + build → dist/
npm run validate:data  # check the game data
```

## Documentation

- [Project specification](./docs/PROJECT_SPEC.md) — what the application does
- [Architecture](./docs/ARCHITECTURE.md) — how the code is organised
- [Data model](./docs/DATA_MODEL.md) — the shape of the game data
- [Data sourcing](./docs/DATA_SOURCING.md) — where the data comes from and how it is verified
