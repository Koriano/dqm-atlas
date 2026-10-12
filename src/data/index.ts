import type { GameData, GameId } from "../domain/game"

const loaders: Record<GameId, () => Promise<GameData>> = {
  dqmj2: () => import("./dqmj2").then((module) => module.dqmj2),
}

/** Available games, in release order. */
export const GAME_IDS = Object.keys(loaders) as GameId[]

/** Games planned but without data yet, in release order: the game selector lists them disabled, after the available ones. */
export const UPCOMING_GAME_IDS = ["dqmj1", "dqmj2_pro", "terrys_wonderland", "dqmj3", "dqmj3_pro", "dark_prince", "withered_world"] as const
export type UpcomingGameId = (typeof UPCOMING_GAME_IDS)[number]

export function loadGame(gameId: GameId): Promise<GameData> {
  return loaders[gameId]()
}
