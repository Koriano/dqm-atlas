# Data Model

The contract of the game data. The TypeScript types of `src/domain/` are its source of truth; this document explains
them. Where the values come from is in [DATA_SOURCING.md](./DATA_SOURCING.md).

## Files

Each game has a folder `src/data/<game>/`:

| File | Content |
|---|---|
| `game.json` | the catalogs (see below) and `rules` |
| `monsters.json` | `Monster[]` |
| `recipes.json` | `SynthesisRecipe[]` |
| `skills.json` | `Skill[]` |

Only verified final values are stored there.

## Identifiers

Names are never IDs.

Every entity has a stable ID. IDs are plain strings and remain stable
across data revisions.

## Rank

```ts
type Rank = string
```

Each game declares its own ranks, from lowest to highest, in
`GameRules.rankOrder` (DQMJ2: `F E D C B A S X ???`). Every rank used by
the data must appear there. `???` is a legitimate rank value. Every monster
has exactly one rank.

## Catalogs

Every entity that data references by id is declared by the game in
`game.json`, so the validator can detect unknown ids and the i18n files can
name each entry:

```ts
interface CatalogEntry {
  id: string
}

interface GameEvent extends CatalogEntry {
  kind: string // an eventKinds id
  regionId?: string // a regions id; absent when not tied to one release region
}

interface MonsterGroup extends CatalogEntry {
  monsterIds: string[] // monsters a recipe accepts interchangeably
}
```

| Catalog | Referenced by |
|---|---|
| `families` | `Monster.familyId`, family parent conditions |
| `skills` (declared in `skills.json`) | `Monster.skillId` |
| `abilities` | ability tiers of a skill |
| `traits` | `Monster.traits`, trait tiers of a skill |
| `equipmentTypes` | `Monster.equipment` |
| `resistanceCategories` | keys of `Monster.resistances` |
| `resistanceStages` | reached by a resistance value (see Monster) |
| `locations` | scout and egg obtainments |
| `timesOfDay`, `seasons`, `weathers`, `storyStages` | scout situations (`storyStages` also eggs) |
| `eggColours` | egg obtainments |
| `events`, `eventKinds`, `regions` | event obtainments, `GameEvent.kind`, `GameEvent.regionId` |
| `monsterGroups` | group parent conditions |

Every monster has exactly one family. DQMJ2 has eight families, one of
which is `???` (id `unknown`).

Families and equipment types also declare an icon (see Assets):

```ts
interface Family extends CatalogEntry {
  iconAssetKey: string
}

interface EquipmentType extends CatalogEntry {
  iconAssetKey: string
}
```

A game also says how its family icon files are drawn, since only the drawing
is shown, at the same height in every game:

```ts
interface FamilyIconFrame {
  width: number // size of the files
  height: number
  drawn: { x: number; y: number; width: number; height: number } // the area holding the drawing
}
```

DQMJ2 draws in a 14×20 area of a 48×49 canvas; The Dark Prince fills its 35×35
files.

A trait that changes the monster's sheet declares it; the computation is in `services/stats.ts`:

```ts
interface SheetEffect {
  statMultipliers?: Partial<MonsterStats>
  resistanceBonus?: Record<string, number> // added to the resistance value of each category
}

interface Trait extends CatalogEntry {
  sheetEffect?: SheetEffect // The Dark Prince: Metal Body divides max HP by three and raises resistances
}
```

## Monster

```ts
interface Monster {
  id: string
  libraryId: number
  familyId: string
  rank: Rank
  size: MonsterSize
  maxStats: MonsterStats
  equipment?: string[]
  skillId: string
  traits: MonsterTrait[]
  resistances: ResistanceMap
  obtainments: Obtainment[]
  iconAssetKey: string
}
```

Every field is required except `equipment`, absent in a game where
monsters carry none (The Dark Prince); when present it lists at least one
equipment type. `traits` may be empty: some monsters have no trait. `skillId`
references the monster's signature skill: the skill it always offers,
whether obtained through synthesis or scouted in the wild.

`size` is the size the monster is drawn in, and its own. A game whose
monsters can all have another size declares it in `rules.sizeVariants`.

```ts
interface MonsterTrait {
  traitId: string
  level?: number // the level that unlocks it; absent: from the start
  size?: MonsterSize // the only size in which the monster has it; absent: every size
}
```

`traits` keeps the game's order. Maximum stats and resistances are stored
for the monster's own size, without any trait: the sheet's values in a
size are computed.

```ts
type Resistance =
  | "weak" | "immune" | "absorb" | "reflect" | { level: "resistant"; percent: 25 | 50 | 75 }
  | number
type ResistanceMap = Record<string, Resistance>

interface ResistanceStage extends CatalogEntry {
  min: number // lowest value of the stage
}
```

`resistances` only lists non-neutral categories, keyed by resistance
category id (declared in `resistanceCategories`). A game names each
resistance directly (DQMJ2) or gives its value, which the sheet names by the
stage it reaches, as the game does (The Dark Prince: from −25 to 125, stages
from "weak" to "absorbs"). A game gives values exactly when it declares
`resistanceStages` (ascending `min`); DQMJ2 declares none.
`absorb` means the monster is healed by the attack; `reflect` means it
bounces the attack back.

## Skills

Skills are the one catalog kept in its own file, `skills.json`, because each
entry also lists what the skill unlocks:

```ts
interface Skill extends CatalogEntry {
  tiers: SkillTier[] // unlocking order: ascending points, two tiers may share a threshold
}

type SkillTier =
  | { type: "ability"; points: number; abilityId: string } // a spell or technique
  | { type: "trait"; points: number; traitId: string } // stat bonus, resistance, passive effect
```

`points` is the number of skill points to invest in the skill. Only the
skills a monster carries natively (`Monster.skillId`) are stored; the
`abilities` and `traits` catalogs hold what those skills unlock, so `traits`
is wider than the traits monsters have natively.

## Localization

Translations are external to the domain model.

Names and UI text live in separate i18n files per language:

- `src/i18n/<lang>.json` holds application-level text, including each
  game's display name under `games.<gameId>` (needed by the game selector
  without loading any game's entity names).
- `src/i18n/<gameId>/<lang>.json` holds a single game's entity names,
  with one section per catalog (same key as in `game.json`) plus
  `monsters`, so only the active game and language need to be loaded.
  Two more sections hold the in-game description of an entry, keyed by the
  same ids: `abilityDescriptions` and `traitDescriptions`. A name or a
  description that is not verified in a language is left out, never
  translated by hand.

Translation keys are the stable entity identifiers.

The domain model contains identifiers only, never display names.

## ParentCondition

```ts
type ParentCondition =
  | {
      type: "monster"
      monsterId: string
    }
  | {
      type: "family"
      familyId: string
      minRank?: Rank
      maxRank?: Rank
    }
  | {
      type: "group"
      groupId: string
    }
```

A `group` condition accepts any member of a declared `MonsterGroup`; it
exists for in-game concepts that recipes name as one parent (DQMJ2: the
Incarnus and its eight forms). Other recipes that accept alternative parents
are represented as separate recipes, not as a combined condition. A recipe requiring two copies of the
same monster lists that monster twice in `parents`.

## SynthesisRecipe

Only fixed recipes are stored in `recipes.json`. Normal synthesis is not a
list of recipes: it is computed from `GameRules.normalSynthesis` (see
Normal Synthesis Rule). Each recipe type is its own interface, discriminated
by `type`:

```ts
interface SpecialSynthesis {
  id: string
  type: "special"
  parents: [ParentCondition, ParentCondition]
  result: string
  conditions: SynthesisCondition[]
}

interface FourWaySynthesis {
  id: string
  type: "fourWay"
  parents: [
    ParentCondition,
    ParentCondition,
    ParentCondition,
    ParentCondition,
  ]
  result: string
  conditions: SynthesisCondition[]
}

type SynthesisRecipe =
  | SpecialSynthesis
  | FourWaySynthesis
```

The number of parents is enforced by the type: two for special recipes, four
for four-way recipes. `parents` are unordered. `fourWay` recipes list the
four required grandparents as their `parents`.

When several special recipes match the same pair, only those naming the most
exact monsters apply (a monster × monster recipe overrides a monster × family
one).

## Conditions

```ts
type SynthesisCondition = {
  type: "minimumLevel"
  value: number
}
```

`minimumLevel` represents a level requirement intrinsic to a specific
synthesis relationship. It applies to every parent of the recipe. Since
levels belong to individual monsters, not species, the engine reports what
the pair gives when the condition is met and when it is not.

New condition types are added only when a real game mechanic requires
them, as structured variants — never as a free-form escape hatch.

## Obtainment

Synthesis is implicit in the recipes that produce a monster. Non-synthesis
methods are recorded explicitly:

```ts
interface ScoutSituation {
  timeOfDay?: string // a timesOfDay id
  season?: string // a seasons id
  weather?: string // a weathers id
  storyStage?: string // a storyStages id, e.g. "postgame"
}

type Obtainment =
  | { type: "scout"; locationId: string; when?: ScoutSituation[] }
  | { type: "egg"; locationId: string; eggColours: string[]; storyStage?: string }
  | { type: "event"; eventId: string }
```

A `scout` entry exists per location where the monster can be scouted.
`when` lists the situations in which it appears there; it is absent when the
monster appears in every situation, and a situation omits an axis that does
not restrict it (`{ timeOfDay: "night" }` means at night in any weather).
In DQMJ2, `bad_weather` is the area's bad-weather state (rain, fog, snow…).

A location may list the weathers it can have in each season
(`Location.weathersBySeason`): a situation then covers "every weather" of a
season once it covers those, and a situation the place can never have is not
stored. In The Dark Prince, each world echelon has fine weather and one or two
weathers of its own, which change with the season (fire rain except in winter,
blizzard in winter…); its dungeons have neither season nor weather, so their
scout entries have no `season` or `weather`. A weather or a season that the
game shows as an icon declares it (`iconAssetKey`).

An `egg` entry exists per region where the monster hatches from an egg found
there (The Dark Prince), with the colours of egg it can come from and, when
the egg only appears from a point of the story, that `storyStage`.

An `event` entry references a declared `GameEvent` (library reward,
battle reward, side quest, tag mode encounter, distribution, linked game,
online prize…), whose `kind` groups similar events. Region-locked events
(e.g. Japanese distributions) carry a `regionId`.

## Game Data

```ts
type GameId = "dqmj2" | "dark_prince"

interface GameData {
  id: GameId
  families: Family[]
  familyIconFrame: FamilyIconFrame
  skills: Skill[]
  abilities: Ability[]
  traits: Trait[]
  equipmentTypes: EquipmentType[]
  resistanceCategories: ResistanceCategory[]
  resistanceStages: ResistanceStage[]
  locations: Location[]
  timesOfDay: TimeOfDay[]
  seasons: Season[]
  weathers: Weather[]
  storyStages: StoryStage[]
  eventKinds: EventKind[]
  regions: Region[]
  events: GameEvent[]
  eggColours: EggColour[]
  monsterGroups: MonsterGroup[]
  monsters: Monster[]
  recipes: SynthesisRecipe[]
  rules: GameRules
}
```

## Game Rules

```ts
interface GameRules {
  rankOrder: Rank[] // lowest to highest
  normalSynthesis: NormalSynthesisRule
  sizeVariants?: SizeVariant[] // absent: every monster has its own size only
}

interface SizeVariant extends SheetEffect {
  size: MonsterSize
}
```

A size variant is another size any monster can have, and what it changes on
its sheet (The Dark Prince's large size: max HP and MP ×1.5, other stats ×1.1,
+50 to six status resistances).

`GameRules` only holds rules that are intrinsic to the dataset and needed
to evaluate its recipes. Universal prerequisites of the synthesis system
that apply to every recipe are outside the scope of the domain model and
are not represented here.

## Normal Synthesis Rule

Each game declares how normal synthesis picks its candidates. The rule is a
discriminated union so games with other systems add a new `kind` without
changing the engine's reverse lookups.

```ts
type NormalSynthesisRule = LibraryOrderSynthesisRule | FamilyTableSynthesisRule

interface LibraryOrderSynthesisRule {
  kind: "libraryOrder"
  resultMonsterIds: string[] // monsters normal synthesis can produce
  familyMix: { families: [string, string]; result: string }[]
  specialRecipeReplaces: "familyMixCandidate" | "allCandidates"
}
```

`libraryOrder` (DQMJ2) works on library numbers (`Monster.libraryId`) and
only ever produces monsters listed in `resultMonsterIds`:

- two identical parents give that same monster;
- otherwise, for each parent's family, the first eligible monster numbered
  above the higher-numbered parent — or the family's last eligible monster if
  there is none; a parent whose family has no eligible monster (`???`) is
  offered back as-is;
- for parents of different families listed in `familyMix`, the first
  eligible monster of the mixed family numbered above the lower-numbered
  parent (same fallback). Parents of the same family get no family-mix
  candidate;
- when a special recipe matches the pair, it replaces either the family-mix
  candidate only or every candidate, per `specialRecipeReplaces`.

```ts
interface FamilyTableSynthesisRule {
  kind: "familyTable"
  table: { families: [string, string]; results: Record<Rank, string> }[]
}
```

`familyTable` (The Dark Prince) reads the game's table of ordered family
pairs. The order of the two parents matters:

- parents of the same family, or of a family absent from the table (`???`),
  give no candidate;
- otherwise the row "family of parent 1 × family of parent 2" and the row
  "family of parent 2 × family of parent 1" each give the child of the rank
  of **parent 2**; a rank absent from the row (A, S, X) gives none;
- a candidate identical to one of the parents is not offered;
- special recipes add their result to these candidates, they replace none.

## Engine Result

Engine output types are defined alongside the synthesis engine
(`src/services/synthesis/types.ts`). A recipe outcome refers to the complete
`SpecialSynthesis`; a normal outcome carries the candidate slot
(`parentFamily`, `familyMix`, `identicalParents`) and, when a matching
recipe has level conditions, the id of the recipe that would override it
(`unlessRecipeId`).

## Graph

The graph is not part of the data model: it is rebuilt from the data and the user's choices, and can be thrown away
at any time (see [ARCHITECTURE.md](./ARCHITECTURE.md)). A generic parent (`family`, `group`) is never expanded into
all its candidates: the tree shows one slot, which the user fills with one monster.

## Representative Origin

Do not add a `primaryRecipe` field to `Monster`.

The representative origin is computed:

```text
four-way → special → normal
```

using the first recipe in data order within the selected type; normal
synthesis applies when at least one pair of parents produces the monster.

## Assets

Icons are provided manually by the project owner; they are not game data and are never downloaded or generated.

| Entity | Field | File |
|---|---|---|
| `Monster` | `iconAssetKey` | `public/assets/<game>/monsters/<iconAssetKey>.png` |
| `Family` | `iconAssetKey` | `public/assets/<game>/families/<iconAssetKey>.png` |
| `EquipmentType` | `iconAssetKey` | `public/assets/<game>/equipment/<iconAssetKey>.png` |
| `Weather` | `iconAssetKey` (optional) | `public/assets/<game>/weathers/<iconAssetKey>.png` |
| `Season` | `iconAssetKey` (optional) | `public/assets/<game>/seasons/<iconAssetKey>.png` |

Addresses are built in one place (`src/services/assets.ts`). The validator checks that each file exists.
