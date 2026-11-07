import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';

const url = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const screenshotDir = process.env.TEST_SCREENSHOT_DIR;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const button = (page, label) => page.getByRole('button', { name: label, exact: true });
const title = (page, label) => page.getByRole('heading', { name: label, exact: true });
const visible = (locator, timeout = 12_000) => locator.waitFor({ state: 'visible', timeout });
async function track(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}
async function findGame(page, name) {
  await page.getByRole('searchbox', { name: 'Find a game' }).fill(name);
  await page.getByRole('button', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click();
  await visible(page.getByRole('dialog').getByRole('heading', { name, exact: true }));
  await button(page, 'Invite to play').click();
  await visible(title(page.getByRole('region', { name: 'Game ready check' }), name));
}
async function begin(a, b, name) {
  await findGame(a, name);
  await visible(title(b.getByRole('region', { name: 'Game ready check' }), name));
  await button(a, 'I’m ready').click();
  await visible(button(a, 'Ready'));
  await button(b, 'I’m ready').click();
  await visible(button(b, 'Ready'));
  await button(a, 'Start game').click();
  await visible(a.getByRole('heading', { name, exact: true, level: 1 }));
  await visible(b.getByRole('heading', { name, exact: true, level: 1 }));
}
async function switchSeat(page, label) {
  await button(page, 'Switch seat').click();
  await button(page, label).click();
}

test('mobile layout, accessible catalog, same-device sealed reveal', { timeout: 70_000 }, async () => {
  const browser = await chromium.launch({ executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
    const errors = await track(page);
    await page.goto(url);
    await visible(page.getByRole('heading', { level: 1 }));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 360);
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/arcade-mobile.png` });
    await button(page, 'Explore demo').click();
    await visible(title(page, 'Your game night.'));
    await visible(page.getByText('LOCAL DEMO', { exact: true }));
    await findGame(page, 'This or That');
    await button(page, 'I’m ready').click();
    await switchSeat(page, 'I’m Player 2');
    await button(page, 'I’m ready').click();
    await switchSeat(page, 'I’m Player 1');
    await button(page, 'Start game').click();
    await page.locator('.choice').first().click();
    await button(page, 'Lock in').click();
    await visible(title(page, 'You locked in'));
    await switchSeat(page, 'I’m Player 2');
    assert.equal(await page.locator('.reveal-card').count(), 0);
    await page.locator('.choice').first().click();
    await button(page, 'Lock in').click();
    await visible(page.getByText('You landed in the same place.', { exact: true }));
    assert.equal(await page.locator('.reveal-card').count(), 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 360);
    if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/game-mobile.png` });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('two browser contexts pair directly, reveal, play a board, draw and solve split clues', { timeout: 135_000 }, async () => {
  const browser = await chromium.launch({ executablePath });
  try {
    const [hostContext, guestContext] = await Promise.all([
      browser.newContext({ viewport: { width: 1440, height: 960 } }),
      browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
    ]);
    for (const context of [hostContext, guestContext]) {
      await context.addInitScript(() => {
        window.arcadeWireTypes = [];
        const send = RTCDataChannel.prototype.send;
        RTCDataChannel.prototype.send = function (data) {
          if (typeof data === 'string') window.arcadeWireTypes.push(JSON.parse(data).type);
          return send.call(this, data);
        };
      });
    }
    const [a, b] = await Promise.all([hostContext.newPage(), guestContext.newPage()]);
    const pageErrors = [];
    [a, b].forEach((page) => page.on('pageerror', (error) => pageErrors.push(error.message)));
    await a.goto(url);
    if (screenshotDir) await a.screenshot({ path: `${screenshotDir}/arcade-desktop.png`, fullPage: true });
    await a.getByRole('button', { name: 'Create our room' }).first().click();
    await a.getByLabel('Your nickname').fill('Anu');
    await button(a, 'Continue').click();
    await visible(title(a, 'Invite your partner'));
    const link = await a.getByLabel('Invite link', { exact: true }).inputValue();
    assert.match(link, /#invite=jua1\./);
    await b.goto(link);
    await b.getByLabel('Your nickname').fill('Mira');
    await button(b, 'Continue').click();
    await visible(title(b, 'Send your reply'));
    const reply = await b.getByLabel('Reply code', { exact: true }).inputValue();
    await a.getByLabel('Partner’s reply code').fill('an invalid reply');
    await button(a, 'Connect room').click();
    await visible(a.getByRole('alert').filter({ hasText: 'Paste the complete reply code' }));
    await a.getByLabel('Partner’s reply code').fill(reply);
    await button(a, 'Connect room').click();
    await visible(title(a, 'Your game night.'));
    await visible(title(b, 'Your game night.'));
    await visible(a.locator('.player-chip').filter({ hasText: 'Mira' }).getByText('Here', { exact: true }));
    assert.equal(await b.evaluate(() => document.documentElement.scrollWidth), 390);

    await begin(a, b, 'This or That');
    await a.locator('.choice').first().click();
    await button(a, 'Lock in').click();
    await visible(title(a, 'You locked in'));
    assert.equal(await b.locator('.reveal-card').count(), 0);
    const wireTypes = await a.evaluate(() => window.arcadeWireTypes);
    assert.ok(wireTypes.includes('locks'));
    assert.ok(!wireTypes.includes('open') && !wireTypes.includes('reveal'));
    await b.locator('.choice').first().click();
    await button(b, 'Lock in').click();
    await visible(a.getByText('You landed in the same place.', { exact: true }));
    await visible(b.getByText('You landed in the same place.', { exact: true }));
    assert.ok((await a.evaluate(() => window.arcadeWireTypes)).includes('reveal'));
    assert.ok((await b.evaluate(() => window.arcadeWireTypes)).includes('answer'));
    await button(b, 'Next round').click();
    await visible(a.getByText('ROUND 2 / 5'));
    await button(a, 'Back to room').click();
    await visible(title(b, 'Your game night.'));

    await begin(a, b, 'Connect Four');
    assert.equal(await button(b, 'Drop in column 1').isEnabled(), false);
    await button(a, 'Drop in column 1').click();
    await button(b, 'Drop in column 2').click();
    await button(a, 'Drop in column 1').click();
    await button(b, 'Drop in column 2').click();
    await button(a, 'Drop in column 1').click();
    await button(b, 'Drop in column 2').click();
    await button(a, 'Drop in column 1').click();
    await visible(title(b, 'Anu takes the round!'));
    await button(a, 'Request rematch').click();
    await visible(title(b.getByRole('region', { name: 'Game ready check' }), 'Connect Four'));
    await button(b, 'Cancel invite').click();

    await begin(a, b, 'Draw & Guess');
    await visible(a.getByRole('heading', { name: /^Draw: / }));
    await visible(title(b, 'What are they drawing?'));
    assert.equal(await b.getByRole('heading', { name: /^Draw: / }).count(), 0);
    const target = await a.locator('canvas').boundingBox();
    assert.ok(target);
    await a.mouse.move(target.x + 55, target.y + 65);
    await a.mouse.down();
    await a.mouse.move(target.x + 170, target.y + 65, { steps: 12 });
    await a.mouse.up();
    await b.waitForFunction(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      return data.some((value, i) => i % 4 === 0 && value < 110);
    });
    await button(a, 'Undo').click();
    await b.waitForFunction(() => {
      const canvas = document.querySelector('canvas');
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      return !data.some((value, i) => i % 4 === 0 && value < 110);
    });
    await button(a, 'Back to room').click();

    await begin(a, b, 'Escape Together');
    await visible(a.getByText(/The matinee, feature and encore/));
    await visible(b.getByText(/The usher’s instructions/));
    assert.equal(await b.getByText(/The matinee, feature and encore/).count(), 0);
    await b.getByLabel('Puzzle solution').fill('kry');
    await button(b, 'Try solution').click();
    await visible(a.getByText('The brass box-office key', { exact: true }));
    await button(a, 'Open next clue').click();
    await visible(title(b, 'The After-Hours Cinema · Concessions'));
    await button(a, 'Back to room').click();

    await button(a, 'After Dark settings').click();
    await a.getByLabel('I’m 18 or over and I want to opt in.').check();
    await a.getByLabel('My comfort level').selectOption('3');
    await button(a, 'Opt in for my seat').click();
    await button(b, 'After Dark settings').click();
    await b.getByLabel('I’m 18 or over and I want to opt in.').check();
    await button(b, 'Opt in for my seat').click();
    await visible(button(a, 'After Dark · Flirty'));
    await begin(a, b, 'Spicy This or That');
    await visible(a.getByText('Flirty', { exact: true }));
    await button(b, 'Skip this prompt').click();
    await visible(a.getByText('ROUND 2 / 4'));
    await button(a, 'Return to PG').click();
    await visible(title(b, 'Your game night.'));
    assert.deepEqual(pageErrors, []);
  } finally { await browser.close(); }
});
