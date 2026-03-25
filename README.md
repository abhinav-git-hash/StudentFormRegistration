# StudentFormRegistration

---

## Bharat English – Practice Automation (Windows)

A Playwright script that opens your Bharat English lesson, waits for you to type
each answer in the terminal, submits it on-screen, and moves to the next question.
Your login session is saved so you only need to enter credentials once.

---

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18 LTS or newer | https://nodejs.org |
| npm | comes with Node | – |

---

### One-time Setup

Open **Command Prompt** or **PowerShell** in the project folder, then run:

```bat
npm install
npm run setup
```

`npm install` downloads Playwright.  
`npm run setup` downloads the Chromium browser used by the script.

---

### Running the Script

#### First run (login required)

```bat
npm start
```

1. A browser window opens automatically.
2. **Log in manually** in the browser (email + password).
3. After you press **Enter** in the terminal (or the page redirects), the script
   saves your session to `storageState.json`.
4. The lesson page opens.
5. For each question:
   - The question text is printed in the terminal.
   - The input field is highlighted orange in the browser.
   - Type your answer in the **terminal** and press **Enter**.
   - The script types it into the browser field and clicks Submit/Next.
6. Repeat until the lesson is finished.

#### Subsequent runs (no login needed)

```bat
npm start
```

The saved session is loaded automatically – no login step.

---

### Re-login

If your session expires (usually after ~7 days), delete the saved state and
run the script again:

```bat
del storageState.json
npm start
```

---

### File Overview

| File | Purpose |
|------|---------|
| `automation.js` | Main script – login, session saving, question loop |
| `playwright.config.js` | Playwright configuration |
| `package.json` | Project metadata and dependencies |
| `.gitignore` | Excludes `node_modules/` and `storageState.json` from git |
| `storageState.json` | **Created at runtime** – stores your login session (not committed) |

---

### Troubleshooting

| Problem | Fix |
|---------|-----|
| "Cannot find module 'playwright'" | Run `npm install` |
| Browser doesn't open | Run `npm run setup` to install Chromium |
| Session expired / login loop | Delete `storageState.json` and run again |
| Answer not filling in | The site's input selector may have changed – open DevTools (F12) and inspect the input element, then update `INPUT_SELECTORS` in `automation.js` |
| Submit button not found | Update `SUBMIT_BUTTON_SELECTORS` in `automation.js` to match the button's text or class |

---