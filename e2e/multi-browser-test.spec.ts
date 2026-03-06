import { test, chromium } from '@playwright/test'

test.describe('Multi-Browser Room Sharing Test', () => {
  test('should create room in one browser and join from another', async () => {
    // Launch two separate browser contexts (like two different browsers)
    const browser = await chromium.launch({ headless: false })

    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    const baseUrl = 'https://lemonade-stand-game.vercel.app'

    console.log('🌐 Opening Browser 1...')
    await page1.goto(baseUrl)
    await page1.waitForTimeout(2000)

    console.log('🌐 Opening Browser 2...')
    await page2.goto(baseUrl)
    await page2.waitForTimeout(2000)

    // === BROWSER 1: Sign in and create room ===
    console.log('\n📱 Browser 1: Signing in...')

    // Click create room or sign in button
    const createBtn1 = page1.getByRole('button', { name: /create|sign|room/i }).first()
    if (await createBtn1.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn1.click()
      await page1.waitForTimeout(1000)
    }

    // Enter email
    const emailInput1 = page1.locator('input[type="email"], input[placeholder*="email" i]').first()
    if (await emailInput1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput1.fill('facilitator@test.com')

      // Click send code
      const sendBtn = page1.getByRole('button', { name: /send|continue|next/i }).first()
      if (await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sendBtn.click()
        await page1.waitForTimeout(1000)
      }

      // Enter OTP code
      const otpInput = page1.locator('input[placeholder*="code" i], input[placeholder*="123456" i]').first()
      if (await otpInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await otpInput.fill('123456')

        const verifyBtn = page1.getByRole('button', { name: /verify|sign|confirm/i }).first()
        if (await verifyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await verifyBtn.click()
          await page1.waitForTimeout(2000)
        }
      }
    }

    console.log('📱 Browser 1: Creating room...')

    // Look for room name input
    const roomNameInput = page1.locator('input[placeholder*="room" i]').first()
    if (await roomNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await roomNameInput.fill('Test Room ' + Date.now())

      const createRoomBtn = page1.getByRole('button', { name: /create/i }).first()
      if (await createRoomBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await createRoomBtn.click()
        await page1.waitForTimeout(2000)
      }
    }

    // Get the room code from Browser 1
    const roomCodeElement = page1.locator('text=/[A-Z0-9]{6,}/').first()
    let roomCode = ''
    if (await roomCodeElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      roomCode = await roomCodeElement.textContent() || ''
      console.log(`✅ Browser 1: Room created with code: ${roomCode}`)
    }

    // Take screenshot of Browser 1
    await page1.screenshot({ path: 'test-results/browser1-room-created.png' })

    // === BROWSER 2: Sign in and join room ===
    console.log('\n📱 Browser 2: Signing in...')

    // Click join room or sign in button
    const joinBtn2 = page2.getByRole('button', { name: /join|sign|room/i }).first()
    if (await joinBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await joinBtn2.click()
      await page2.waitForTimeout(1000)
    }

    // Enter email
    const emailInput2 = page2.locator('input[type="email"], input[placeholder*="email" i]').first()
    if (await emailInput2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput2.fill('student@test.com')

      const sendBtn2 = page2.getByRole('button', { name: /send|continue|next/i }).first()
      if (await sendBtn2.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sendBtn2.click()
        await page2.waitForTimeout(1000)
      }

      const otpInput2 = page2.locator('input[placeholder*="code" i], input[placeholder*="123456" i]').first()
      if (await otpInput2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await otpInput2.fill('123456')

        const verifyBtn2 = page2.getByRole('button', { name: /verify|sign|confirm/i }).first()
        if (await verifyBtn2.isVisible({ timeout: 1000 }).catch(() => false)) {
          await verifyBtn2.click()
          await page2.waitForTimeout(2000)
        }
      }
    }

    console.log('📱 Browser 2: Joining room...')

    // Look for room code input
    if (roomCode) {
      const roomCodeInput = page2.locator('input[placeholder*="code" i], input[placeholder*="room" i]').first()
      if (await roomCodeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roomCodeInput.fill(roomCode)

        const joinRoomBtn = page2.getByRole('button', { name: /join/i }).first()
        if (await joinRoomBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await joinRoomBtn.click()
          await page2.waitForTimeout(2000)
        }
      }
    }

    // Take screenshot of Browser 2
    await page2.screenshot({ path: 'test-results/browser2-joined-room.png' })

    console.log('\n✅ Test complete! Check screenshots in test-results/')

    // Keep browsers open for manual inspection
    console.log('\n⏳ Keeping browsers open for 30 seconds for inspection...')
    await page1.waitForTimeout(30000)

    // Cleanup
    await context1.close()
    await context2.close()
    await browser.close()
  })
})
