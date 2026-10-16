import type { GameData } from "../../domain/game"

import gameJson from "./game.json"
import monstersJson from "./monsters.json"
import recipesJson from "./recipes.json"
import skillsJson from "./skills.json"

export const darkPrince = {
  ...gameJson,
  monsters: monstersJson,
  recipes: recipesJson,
  skills: skillsJson,
} as unknown as GameData
