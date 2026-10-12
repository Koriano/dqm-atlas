import type { GameData, Skill } from "../src/domain/game"
import type { Monster } from "../src/domain/monster"
import type { SynthesisRecipe } from "../src/domain/synthesis"

export type GameFile = Omit<GameData, "monsters" | "recipes" | "skills">
export type MonstersFile = Monster[]
export type RecipesFile = SynthesisRecipe[]
export type SkillsFile = Skill[]
