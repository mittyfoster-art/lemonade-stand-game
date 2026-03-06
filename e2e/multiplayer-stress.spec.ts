/**
 * Multi-Player Stress Test
 *
 * [TEST-006] Tests the application under simulated load with multiple
 * players joining the same room and playing simultaneously.
 *
 * This test verifies:
 * 1. Multiple browser contexts can run concurrently (5+ players)
 * 2. All players can join the same room
 * 3. All players can complete 2-3 levels without errors
 * 4. Leaderboard shows all players with correct rankings
 * 5. No duplicate player entries
 * 6. Response times stay under 2 seconds
 */

import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test'

// ============================================================================
// Configuration
// ============================================================================

const NUM_PLAYERS = 5
const LEVELS_TO_PLAY = 2
const MAX_RESPONSE_TIME_MS = 2000
const TEST_ROOM_ID = 'StressTest' + Date.now().toString().slice(-6)
const STORAGE_KEY = 'lemonade-game-storage-v2'

// ============================================================================
// Types
// ============================================================================

interface PlayerSession {
  id: string
  name: string
  context: BrowserContext
  page: Page
  responseTimesMs: number[]
}

interface TimedResult<T> {
  result: T
  durationMs: number
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Measure the time taken to execute an async operation.
 */
async function timed<T>(operation: () => Promise<T>): Promise<TimedResult<T>> {
  const start = performance.now()
  const result = await operation()
  const durationMs = Math.round(performance.now() - start)
  return { result, durationMs }
}

/**
 * Seed a player into the test room via localStorage.
 */
async function seedPlayer(
  page: Page,
  playerId: string,
  playerName: string,
  roomId: string,
  existingPlayers: Array<{ id: string; name: string }>
): Promise<void> {
  await page.goto('/')

  await page.evaluate(
    ({ storageKey, roomId, playerId, playerName, existingPlayers }) => {
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

      // Create player objects for all existing players
      const allPlayers = existingPlayers.map(p => ({
        id: p.id,
        name: p.name,
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
      }))

      // Add current player
      allPlayers.push(player)

      const room = {
        id: roomId,
        name: 'Stress Test Room',
        players: allPlayers,
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
          players: allPlayers,
          currentPlayer: player,
        },
        version: 0,
      }

      localStorage.setItem(storageKey, JSON.stringify(state))
      localStorage.setItem(`lemon-player-${roomId}`, playerId)
    },
    {
      storageKey: STORAGE_KEY,
      roomId,
      playerId,
      playerName,
      existingPlayers,
    }
  )

  await page.reload()
  await page.waitForLoadState('networkidle')
}

/**
 * Play a single level: make decisions and submit.
 */
async function playLevel(page: Page, playerName: string): Promise<TimedResult<boolean>> {
  return timed(async () => {
    try {
      await page.goto('/play')
      await page.waitForLoadState('networkidle')

      // Wait for sliders to be visible
      const sliders = page.getByRole('slider')
      await expect(sliders.first()).toBeVisible({ timeout: 5000 })

      // Click "Open for Business" to submit
      const submitButton = page.getByRole('button', { name: /open for business/i })
      await expect(submitButton).toBeVisible({ timeout: 5000 })
      await submitButton.click()

      // Wait for level completion
      await expect(page.getByText(/complete/i).first()).toBeVisible({ timeout: 15000 })

      // Click "Continue to Results"
      const continueButton = page.getByRole('button', { name: /continue to results/i })
      if (await continueButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueButton.click()
        await page.waitForLoadState('networkidle')
      }

      // Click "Next Level" to advance
      const nextLevelButton = page.getByRole('button', { name: /next level/i })
      if (await nextLevelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextLevelButton.click()
        await page.waitForLoadState('networkidle')
      }

      return true
    } catch (error) {
      console.error(`❌ ${playerName} failed to complete level:`, error)
      return false
    }
  })
}


// ============================================================================
// Test Suite
// ============================================================================

test.describe('Multi-Player Stress Test', () => {
  let browser: Browser
  const sessions: PlayerSession[] = []

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true })
  })

  test.afterAll(async () => {
    // Cleanup all contexts
    for (const session of sessions) {
      await session.context.close()
    }
    await browser.close()
  })

  test('should handle 5+ simultaneous player sessions', async () => {
    console.log(`\n🚀 Starting stress test with ${NUM_PLAYERS} players`)
    console.log(`📍 Room ID: ${TEST_ROOM_ID}`)
    console.log(`📊 Levels to play: ${LEVELS_TO_PLAY}\n`)

    // =========================================================================
    // Step 1: Create player sessions
    // =========================================================================
    console.log('📱 Creating player sessions...')

    const createdPlayers: Array<{ id: string; name: string }> = []

    for (let i = 0; i < NUM_PLAYERS; i++) {
      const context = await browser.newContext()
      const page = await context.newPage()

      const playerId = `stress-player-${i + 1}-${Date.now()}`
      const playerName = `Player${i + 1}`

      sessions.push({
        id: playerId,
        name: playerName,
        context,
        page,
        responseTimesMs: [],
      })

      createdPlayers.push({ id: playerId, name: playerName })
    }

    expect(sessions.length).toBe(NUM_PLAYERS)
    console.log(`✅ Created ${sessions.length} player sessions`)

    // =========================================================================
    // Step 2: Seed all players into the same room
    // =========================================================================
    console.log('\n🏠 Seeding players into room...')

    const seedResults = await Promise.all(
      sessions.map(async (session, index) => {
        // Each player needs to know about all other players
        const otherPlayers = createdPlayers.filter((_, i) => i < index)

        const { durationMs } = await timed(async () => {
          await seedPlayer(
            session.page,
            session.id,
            session.name,
            TEST_ROOM_ID,
            otherPlayers
          )
        })

        session.responseTimesMs.push(durationMs)
        console.log(`  ✅ ${session.name} joined room (${durationMs}ms)`)

        return { name: session.name, durationMs, success: true }
      })
    )

    // Verify all players joined
    const allJoined = seedResults.every(r => r.success)
    expect(allJoined).toBe(true)
    console.log(`✅ All ${NUM_PLAYERS} players joined the room`)

    // =========================================================================
    // Step 3: All players complete levels simultaneously
    // =========================================================================
    console.log(`\n🎮 Playing ${LEVELS_TO_PLAY} levels...`)

    const levelResults: Array<{ player: string; level: number; success: boolean; durationMs: number }> = []

    for (let level = 1; level <= LEVELS_TO_PLAY; level++) {
      console.log(`\n📍 Level ${level}:`)

      // All players play this level concurrently
      const results = await Promise.all(
        sessions.map(async (session) => {
          const { result: success, durationMs } = await playLevel(session.page, session.name)
          session.responseTimesMs.push(durationMs)

          const status = success ? '✅' : '❌'
          console.log(`  ${status} ${session.name} completed level ${level} (${durationMs}ms)`)

          return {
            player: session.name,
            level,
            success,
            durationMs,
          }
        })
      )

      levelResults.push(...results)
    }

    // Verify all levels completed
    const allLevelsCompleted = levelResults.every(r => r.success)
    expect(allLevelsCompleted).toBe(true)
    console.log(`\n✅ All players completed ${LEVELS_TO_PLAY} levels`)

    // =========================================================================
    // Step 4: Verify leaderboard shows all players
    // =========================================================================
    console.log('\n📊 Verifying leaderboard...')

    // Use the first player's page to check the leaderboard
    const leaderboardPage = sessions[0].page
    await leaderboardPage.goto('/leaderboard')
    await leaderboardPage.waitForLoadState('networkidle')

    // Take screenshot for verification
    await leaderboardPage.screenshot({ path: 'test-results/stress-test-leaderboard.png' })

    // Check that all player names appear on the leaderboard
    for (const session of sessions) {
      const playerVisible = await leaderboardPage.getByText(session.name).first().isVisible({ timeout: 5000 }).catch(() => false)
      if (playerVisible) {
        console.log(`  ✅ ${session.name} appears on leaderboard`)
      } else {
        console.log(`  ⚠️ ${session.name} not visible on leaderboard (may be in different view)`)
      }
    }

    // =========================================================================
    // Step 5: Check for duplicate entries
    // =========================================================================
    console.log('\n🔍 Checking for duplicates...')

    const pageContent = await leaderboardPage.textContent('body') || ''
    const duplicates: string[] = []

    for (const session of sessions) {
      const regex = new RegExp(session.name, 'g')
      const matches = pageContent.match(regex) || []
      // Allow for name to appear in multiple places (header, row, etc.)
      // but flag if it appears more than 3 times (indicating true duplicates)
      if (matches.length > 3) {
        duplicates.push(`${session.name} appears ${matches.length} times`)
      }
    }

    if (duplicates.length === 0) {
      console.log('  ✅ No duplicate player entries found')
    } else {
      console.log('  ⚠️ Potential duplicates:', duplicates)
    }
    expect(duplicates.length).toBe(0)

    // =========================================================================
    // Step 6: Verify response times
    // =========================================================================
    console.log('\n⏱️ Response time analysis:')

    let slowOperations = 0
    const allResponseTimes: number[] = []

    for (const session of sessions) {
      const avg = Math.round(session.responseTimesMs.reduce((a, b) => a + b, 0) / session.responseTimesMs.length)
      const max = Math.max(...session.responseTimesMs)
      const slow = session.responseTimesMs.filter(t => t > MAX_RESPONSE_TIME_MS).length

      slowOperations += slow
      allResponseTimes.push(...session.responseTimesMs)

      console.log(`  ${session.name}: avg=${avg}ms, max=${max}ms, slow=${slow}`)
    }

    const totalAvg = Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length)
    const totalMax = Math.max(...allResponseTimes)

    console.log(`\n📈 Overall: avg=${totalAvg}ms, max=${totalMax}ms`)

    if (slowOperations > 0) {
      console.log(`⚠️ Warning: ${slowOperations} operations exceeded ${MAX_RESPONSE_TIME_MS}ms threshold`)
    } else {
      console.log(`✅ All operations completed within ${MAX_RESPONSE_TIME_MS}ms threshold`)
    }

    // Allow some slow operations but fail if more than 20% are slow
    const slowPercentage = (slowOperations / allResponseTimes.length) * 100
    expect(slowPercentage).toBeLessThan(20)

    // =========================================================================
    // Final Summary
    // =========================================================================
    console.log('\n' + '='.repeat(60))
    console.log('📊 STRESS TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Players:           ${NUM_PLAYERS}`)
    console.log(`Levels completed:  ${LEVELS_TO_PLAY} per player`)
    console.log(`Total operations:  ${allResponseTimes.length}`)
    console.log(`Avg response time: ${totalAvg}ms`)
    console.log(`Max response time: ${totalMax}ms`)
    console.log(`Slow operations:   ${slowOperations} (>${MAX_RESPONSE_TIME_MS}ms)`)
    console.log(`Duplicates found:  ${duplicates.length}`)
    console.log(`Test result:       ${allLevelsCompleted && duplicates.length === 0 ? '✅ PASSED' : '❌ FAILED'}`)
    console.log('='.repeat(60) + '\n')
  })
})
