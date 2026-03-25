/**
 * Centralized game configuration
 * Defines available games and their allowed lobby modes
 */

export interface GameMode {
  id: string
  name: string
  teamSize: number
  players: number
  description: string
  duration: string
  prizePool: string
  color: string
  matchType: string
}

export interface GameConfig {
  id: string
  name: string
  icon: string
  color: string
  allowedModes: string[]
  defaultMode: string
  description: string
}

export const GAME_MODES: Record<string, GameMode> = {
  '1v1': {
    id: '1v1',
    name: '1v1',
    teamSize: 1,
    players: 2,
    description: '1v1 Strategic Assessment',
    duration: '15-20 min',
    prizePool: '$10 Platform Prize',
    color: 'bg-blue-500',
    matchType: '1v1_draft',
  },
  '2v2': {
    id: '2v2',
    name: '2v2',
    teamSize: 2,
    players: 4,
    description: 'Small Team Coordination',
    duration: '20-25 min',
    prizePool: '$10 Platform Prize',
    color: 'bg-green-500',
    matchType: '2v2_draft',
  },
  '3v3': {
    id: '3v3',
    name: '3v3',
    teamSize: 3,
    players: 6,
    description: 'Balanced Strategic Play',
    duration: '25-30 min',
    prizePool: '$10 Platform Prize',
    color: 'bg-purple-500',
    matchType: '3v3_draft',
  },
  '4v4': {
    id: '4v4',
    name: '4v4',
    teamSize: 4,
    players: 8,
    description: 'Deep Tactical Deployment',
    duration: '30-35 min',
    prizePool: '$50 Platform Prize',
    color: 'bg-orange-500',
    matchType: '4v4_draft',
  },
  '5v5': {
    id: '5v5',
    name: '5v5',
    teamSize: 5,
    players: 10,
    description: 'Full strategic engagement',
    duration: '35-40 min',
    prizePool: '$10 Platform Prize',
    color: 'bg-red-500',
    matchType: '5v5_draft',
  },
  '6v6': {
    id: '6v6',
    name: '6v6',
    teamSize: 6,
    players: 12,
    description: 'Large scale assessment',
    duration: '40-45 min',
    prizePool: '$10 Platform Prize',
    color: 'bg-indigo-500',
    matchType: '6v6_draft',
  },
}

export const GAMES: Record<string, GameConfig> = {
  starcraft: {
    id: 'starcraft',
    name: 'StarCraft',
    icon: '⚔️',
    color: 'bg-blue-600',
    allowedModes: ['1v1'],
    defaultMode: '1v1',
    description: '1v1 competitive RTS',
  },
  fortnite: {
    id: 'fortnite',
    name: 'Fortnite',
    icon: '🎮',
    color: 'bg-purple-600',
    allowedModes: ['1v1', '2v2'],
    defaultMode: '1v1',
    description: '1v1 and 2v2 battle royale',
  },
  omega_strikers: {
    id: 'omega_strikers',
    name: 'Omega Strikers',
    icon: '⚽',
    color: 'bg-orange-600',
    allowedModes: ['3v3'],
    defaultMode: '3v3',
    description: '3v3 competitive striker',
  },
  zealot_hockey: {
    id: 'zealot_hockey',
    name: 'Zealot Hockey',
    icon: '🏒',
    color: 'bg-cyan-600',
    allowedModes: ['4v4'],
    defaultMode: '4v4',
    description: '4v4 hockey action',
  },
  counterstrike: {
    id: 'counterstrike',
    name: 'Counter-Strike',
    icon: '🔫',
    color: 'bg-yellow-600',
    allowedModes: ['5v5'],
    defaultMode: '5v5',
    description: '5v5 tactical shooter',
  },
  rainbow_six_siege: {
    id: 'rainbow_six_siege',
    name: 'Rainbow Six Siege',
    icon: '🛡️',
    color: 'bg-red-600',
    allowedModes: ['6v6'],
    defaultMode: '6v6',
    description: '6v6 tactical operations',
  },
}

/**
 * Get allowed modes for a specific game
 */
export function getAllowedModesForGame(gameId: string): GameMode[] {
  const game = GAMES[gameId]
  if (!game) return []

  return game.allowedModes.map((modeId) => GAME_MODES[modeId]).filter(Boolean)
}

/**
 * Check if a mode is allowed for a game
 */
export function isModeAllowedForGame(gameId: string, modeId: string): boolean {
  const game = GAMES[gameId]
  if (!game) return false

  return game.allowedModes.includes(modeId)
}

/**
 * Get game configuration by ID
 */
export function getGameConfig(gameId: string): GameConfig | null {
  return GAMES[gameId] || null
}

/**
 * Get all available games as an array
 */
export function getAllGames(): GameConfig[] {
  return Object.values(GAMES)
}
