/**
 * E2E test helpers for the Lemonade Stand Game.
 *
 * Provides utilities for seeding game state via localStorage so tests can
 * start from specific points in the game flow without clicking through the
 * entire facilitator/join sequence each time.
 */

import type { Page } from '@playwright/test'

// ============================================================================
// Constants
// ============================================================================

/** localStorage key used by Zustand persist middleware. */
const STORAGE_KEY = 'lemonade-game-storage-v2'

/** A deterministic room ID for testing. */
export const TEST_ROOM_ID = 'CoolLemons4821'

/** A deterministic player ID for testing. */
export const TEST_PLAYER_ID = 'player-test-001'

/** Default player name used in tests. */
export const TEST_PLAYER_NAME = 'TestPlayer'

// ============================================================================
// State Seeding
// ============================================================================

/**
 * Seed localStorage with a game state that has a player already joined in a
 * room and ready to play level 1. This bypasses the auth + join flow so
 * gameplay tests can start immediately.
 */
export async function seedPlayerInRoom(page: Page): Promise<void> {
  await page.goto('/')

  await page.evaluate(
    ({ storageKey, roomId, playerId, playerName }) => {
      const player = {
        id: playerId,
        name: playerName,
        roomId: roomId,
        currentLevel: 1,
        completedLevels: [],
        budget: 500,
        totalProfit: 0,
        totalRevenue: 0,
        totalCupsSold: 0,
        peakBudget: 500,
        lowestBudget: 500,
        activeLoan: null,
        loanHistory: [],
        levelResults: [],
        isGameOver: false,
        gameOverAtLevel: null,
      }

      const room = {
        id: roomId,
        name: 'Test Room',
        players: [player],
        createdAt: Date.now(),
        isActive: true,
        campStartDate: (() => {
          const d = new Date()
          d.setDate(d.getDate() - 5)
          return d.toISOString().split('T')[0]
        })(),
      }

      const state = {
        state: {
          user: null,
          isAuthenticated: false,
          currentGameRoom: room,
          players: [player],
          currentPlayer: player,
        },
        version: 0,
      }

      localStorage.setItem(storageKey, JSON.stringify(state))
      localStorage.setItem(`lemon-player-${roomId}`, playerId)
    },
    {
      storageKey: STORAGE_KEY,
      roomId: TEST_ROOM_ID,
      playerId: TEST_PLAYER_ID,
      playerName: TEST_PLAYER_NAME,
    }
  )

  // Reload so Zustand picks up the seeded state
  await page.reload()
  await page.waitForLoadState('networkidle')
}

/**
 * Clear all game-related localStorage entries.
 */
export async function clearGameState(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear())
}
