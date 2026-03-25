/**
 * Bharat English – Personal Practice Automation
 *
 * Flow:
 *  1. If storageState.json does NOT exist  → open browser, let user log in manually, then save session.
 *  2. If storageState.json EXISTS           → load saved session and go directly to the lesson.
 *  3. For every question on the page:
 *       - Print the question text to the terminal.
 *       - Wait for the user to type the answer and press Enter.
 *       - Type the answer into the on-screen input field and submit.
 *       - Move to the next question.
 *  4. Stop when no more questions / next-button is found.
 *
 * Run:  node automation.js
 */

'use strict';

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Constants ──────────────────────────────────────────────────────────────────
const STORAGE_STATE_FILE = path.join(__dirname, 'storageState.json');
const SITE_ORIGIN       = 'https://corporate.bharatenglish.org';
const LESSON_URL        = 'https://corporate.bharatenglish.org/#/practice/16530/lessons/377622?sectionId=4&unitId=259';

// Selector candidates – the script tries each in order and uses the first match.
const QUESTION_SELECTORS = [
  '[class*="question-text"]',
  '[class*="questionText"]',
  '[class*="question_text"]',
  '[class*="question"]',
  '[class*="exercise"]',
  '[class*="prompt"]',
  'h2',
  'h3',
  'p',
];

const INPUT_SELECTORS = [
  'input[type="text"]',
  'input[type="search"]',
  'textarea',
  'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="hidden"])',
];

const SUBMIT_BUTTON_SELECTORS = [
  'button:has-text("Submit")',
  'button:has-text("Check")',
  'button:has-text("Next")',
  'button:has-text("Confirm")',
  'button:has-text("Done")',
  'a:has-text("Next")',
  '[class*="submit"]',
  '[class*="next"]',
  '[class*="check"]',
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Prompt the user in the terminal and return what they typed.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
function askUser(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}


/**
 * Extract visible, meaningful text from the page that looks like a question.
 * @param {import('playwright').Page} page
 * @returns {Promise<string>}
 */
async function extractQuestionText(page) {
  for (const sel of QUESTION_SELECTORS) {
    try {
      const text = await page.$eval(sel, (el) => el.innerText?.trim());
      if (text && text.length > 5) return text;
    } catch (_) {
      // element not found – try next
    }
  }
  // Fallback: grab first 600 chars of body text
  try {
    const bodyText = await page.$eval('body', (el) => el.innerText?.trim());
    return bodyText?.substring(0, 600) ?? '(Could not extract question)';
  } catch (_) {
    return '(Could not extract question)';
  }
}

// ── Login ──────────────────────────────────────────────────────────────────────

/**
 * Open the site, wait for the user to log in manually (up to 5 minutes),
 * then save the authenticated session to STORAGE_STATE_FILE.
 * @param {import('playwright').BrowserContext} context
 * @param {import('playwright').Page} page
 */
async function loginAndSaveSession(context, page) {
  console.log('\n🔐  Opening login page…');
  console.log('    Please log in using the browser that just opened.');
  console.log('    The script will continue automatically once you are logged in.\n');

  await page.goto(SITE_ORIGIN, { waitUntil: 'domcontentloaded' });

  // Wait until the URL contains "/practice" (indicating a successful login redirect)
  // or until the user confirms in the terminal – whichever comes first.
  const loginConfirmPromise = askUser('    (If the page does not redirect automatically, press Enter here after you have logged in) ');
  const urlChangePromise    = page.waitForURL('**/practice/**', { timeout: 5 * 60 * 1000 }).catch(() => null);

  await Promise.race([loginConfirmPromise, urlChangePromise]);

  // Save the full browser storage state (cookies + localStorage + sessionStorage)
  await context.storageState({ path: STORAGE_STATE_FILE });
  console.log('\n💾  Session saved to storageState.json  (future runs will skip login)');
}

// ── Lesson automation ──────────────────────────────────────────────────────────

/**
 * Navigate to the lesson and answer questions interactively via terminal input.
 * @param {import('playwright').Page} page
 */
async function automateLesson(page) {
  console.log('\n📖  Navigating to lesson…');
  await page.goto(LESSON_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => null); // best-effort

  let questionIndex = 1;

  while (true) {
    console.log(`\n──────────────────────────────────────────`);
    console.log(`📝  Question ${questionIndex}`);
    console.log(`──────────────────────────────────────────`);

    // Wait for the page to settle after each navigation / submission
    await page.waitForLoadState('domcontentloaded').catch(() => null);

    // Wait up to 5 s for an input field to appear; if none shows up the lesson is over
    let inputVisible = false;
    for (const sel of INPUT_SELECTORS) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        inputVisible = true;
        break;
      } catch (_) {
        // not found with this selector – try the next
      }
    }
    if (!inputVisible) {
      console.log('\n✅  No more input fields found – lesson appears to be complete!');
      break;
    }

    // Display the question to the user
    const questionText = await extractQuestionText(page);
    console.log('\n' + questionText + '\n');

    // Highlight the input field visually using a locator
    for (const sel of INPUT_SELECTORS) {
      try {
        const loc = page.locator(sel).first();
        if (await loc.count() > 0) {
          await loc.evaluate((el) => {
            el.style.outline = '3px solid #ff6600';
            el.style.backgroundColor = '#fff8e1';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
          });
          break;
        }
      } catch (_) {
        // try next selector
      }
    }

    // Ask the user for their answer
    const answer = await askUser('➡️  Type your answer and press Enter: ');

    if (!answer) {
      const skip = await askUser('   Answer is empty. Skip this question? (y/n): ');
      if (skip.toLowerCase() === 'y') {
        questionIndex++;
        continue;
      }
      // Try again
      continue;
    }

    console.log(`\n💬  Submitting: "${answer}"`);

    // Use locator-based fill to reliably clear and populate the input field
    for (const sel of INPUT_SELECTORS) {
      try {
        const locator = page.locator(sel).first();
        const count = await locator.count();
        if (count > 0) {
          await locator.fill(answer);       // clears existing value then fills
          await locator.press('Tab');       // move focus away to trigger change event
          console.log('✏️   Answer entered into input field.');
          break;
        }
      } catch (_) {
        // selector not matched – try next
      }
    }

    // Click the Submit / Next / Check button using locators
    let btnClicked = false;
    for (const sel of SUBMIT_BUTTON_SELECTORS) {
      try {
        const btnLoc = page.locator(sel).first();
        if (await btnLoc.count() > 0) {
          await btnLoc.click();
          console.log('🖱️   Clicked submit/next button.');
          btnClicked = true;
          break;
        }
      } catch (_) {
        // try next
      }
    }
    if (!btnClicked) {
      // Fall back to pressing Enter
      await page.keyboard.press('Enter');
      console.log('⌨️   Pressed Enter to submit.');
    }

    // Wait for the next question's input to appear (or a brief networkidle) after submit
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);

    questionIndex++;

    // Safety cap – should never be reached in a normal lesson
    if (questionIndex > 200) {
      console.log('\n⚠️   Reached 200 questions – stopping as a safety measure.');
      break;
    }
  }

  console.log('\n🎉  All done! Your practice session is complete.');
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const hasSession = fs.existsSync(STORAGE_STATE_FILE);

  console.log('┌─────────────────────────────────────────────┐');
  console.log('│   Bharat English – Practice Automation       │');
  console.log('└─────────────────────────────────────────────┘');

  const launchOptions = {
    headless: false, // Always show the browser
    args: ['--start-maximized'],
  };

  let browser;
  try {
    if (hasSession) {
      // ── Reuse saved session ────────────────────────────────────────────────
      console.log('\n📂  Found saved session – skipping login.\n');
      browser = await chromium.launch(launchOptions);
      const context = await browser.newContext({
        storageState: STORAGE_STATE_FILE,
        viewport: null, // let the window decide
      });
      const page = await context.newPage();
      await automateLesson(page);
      await context.close();
    } else {
      // ── Fresh login ────────────────────────────────────────────────────────
      console.log('\n🆕  No saved session found. Please log in when the browser opens.\n');
      browser = await chromium.launch(launchOptions);
      const context = await browser.newContext({ viewport: null });
      const page    = await context.newPage();

      await loginAndSaveSession(context, page);
      await automateLesson(page);
      await context.close();
    }
  } catch (err) {
    console.error('\n❌  Unexpected error:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n✨  Script finished. Goodbye!\n');
}

main();
