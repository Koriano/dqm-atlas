# Data Sourcing

Where the game data comes from and how a value earns its place in `src/data/`. The shape of the data is in
[DATA_MODEL.md](./DATA_MODEL.md).

## Principle

The source is the game itself: what it shows the player. A value is stored only when it has been checked in the
game. Nothing is invented, inferred from a neighbouring monster, or completed "because it is probably that". A value
that has not been checked stays missing, and the application shows it as missing.

The same goes for text: names and descriptions are the game's own wording, in each language. One that has not been
checked in a language is left out, never translated by hand.

## One game, one version

Every fact belongs to an exact game and version. Synthesis rules in particular change between versions.

**DQMJ2 (original)** and **DQMJ2 Professional** are two different games: other monsters, other recipes, other ranks.
The data of one is never used for the other.

For DQMJ2, the reference is the European version, which gives the French and English texts. The Japanese texts are
those of the Japanese original version, taken entry by entry at the same place in the game's text tables as the
European text they stand for.

For The Dark Prince, the reference is the Steam version with its downloadable content, which gives the French,
English and Japanese texts. Two texts are adjusted, by decision of the project owner: family names keep the family's
own word, in the singular in French, as DQMJ2 names them ("Famille des gluants" → "Gluant", "Slime Family" →
"Slime"; Japanese keeps "スライム系"); the healing descriptions give the range of HP restored where the game writes
"at least" a number ("Redonne 30-70 PV à un allié.").
Some names do not exist in the game and were written for the site, by decision of the project owner: the story
stages (short, e.g. "Après Suce-sang"), the egg colours, the "(donjon)" that tells an echelon's dungeons from its
field, the "joins your party" event, and the French and English names of weathers and seasons, which the game only
shows as icons (the names are the icons' text alternative).

## What the game gives

- monsters: family, rank, size, library number, maximum stats, resistances, equipment, traits, skill;
- skills: thresholds, and the ability or trait unlocked at each;
- recipes and their conditions, and the rule of normal synthesis;
- where and when a monster is scouted, and the events that give one;
- names and in-game descriptions.

Keep what was observed apart from what was deduced: a deduction is not a source. When two observations disagree,
neither is picked silently: check again in the game, or ask the project owner.

## What goes in the repository

Only the final checked values, under `src/data/<game>/` and `src/i18n/<game>/`. Working notes and intermediate
tables are never committed.

## Icons

Monster, family and equipment icons are provided by hand by the project owner. They are not part of data research:
they are never searched for, downloaded, generated, or used to identify a monster.

## After a change

Run `npm run validate:data` (see [ARCHITECTURE.md](./ARCHITECTURE.md#data-validation)). It checks that the data is
consistent — shapes, unique ids, references, icon files — and reports missing translations. It does not check that
a value is true to the game: only checking in the game does.

Recipe order in `recipes.json` matters: the representative synthesis of a monster is the first recipe of its type
in data order.

A large import follows the same path as a single value: every value is checked before it is written.
