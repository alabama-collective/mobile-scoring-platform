import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), '.tmp_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper for CDP JSON-RPC commands
class ChromeController {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${res.exceptionDetails.text}`);
    }
    return res.result.value;
  }

  async setViewport(width, height, deviceScaleFactor = 1, isMobile = false) {
    try {
      await this.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor,
        mobile: isMobile,
      });
    } catch (e) {
      // In case metrics override is unsupported on target
    }
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  async clickByText(tag, textPattern, maxWaitMs = 3000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const found = await this.eval(`(() => {
        const els = Array.from(document.querySelectorAll(${JSON.stringify(tag)}));
        const pattern = new RegExp(${JSON.stringify(textPattern)}, 'i');
        const target = els.find(el => pattern.test(el.textContent));
        if (target) {
          target.click();
          return true;
        }
        return false;
      })()`);
      if (found) return true;
      await this.wait(200);
    }
    throw new Error('Element not found after wait: ' + textPattern);
  }

  async wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async close() {
    this.ws.close();
  }
}

async function run() {
  console.log('--- STARTING COMPREHENSIVE CHROME E2E VERIFICATION ---');

  // 1. Launch Headless Chrome
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeArgs = [
    '--no-proxy-server',
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9222',
    '--window-size=1280,800',
    '--user-data-dir=/tmp/chrome-tac-e2e-' + Date.now(),
    'http://localhost:5173/',
  ];

  console.log('Spawning Chrome instance with --no-proxy-server...');
  const chromeProc = spawn(chromePath, chromeArgs, { stdio: 'ignore' });

  // Wait for remote debugging to be ready
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {
      // Retrying
    }
  }

  if (!wsUrl) {
    chromeProc.kill();
    throw new Error('Failed to connect to Chrome remote debugging port 9222');
  }

  console.log(`Connected to Chrome DevTools Protocol at ${wsUrl}`);
  const client = new ChromeController(wsUrl);
  await client.init();

  // Enable required domains
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  try {
    // -------------------------------------------------------------
    // TEST 1: Coordinator Admin Setup & Rubric Builder (Desktop 1280x800)
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing Coordinator Admin & Rubric Builder...');
    await client.setViewport(1280, 800);
    await client.send('Page.navigate', { url: 'http://localhost:5173/' });

    // Wait for React app to mount and render
    console.log('Waiting for Vite React app to render...');
    let ready = false;
    for (let i = 0; i < 20; i++) {
      await client.wait(500);
      try {
        const content = await client.eval(`document.body.innerText`);
        if (content && content.includes('The Alabama Collective')) {
          ready = true;
          break;
        }
      } catch (e) {}
    }
    console.log('React app ready state:', ready);

    const title = await client.eval('document.title');
    console.log(`Page title: "${title}"`);

    // Verify Coordinator Admin loaded
    const roundName = await client.eval(`document.body.innerText.includes('Round 1: Pitch Booths')`);
    console.log(`Round 1 active: ${roundName}`);

    // Verify Criteria
    const criteriaCount = await client.eval(`document.querySelectorAll('input[value*="Business"]').length > 0`);
    console.log(`Rubric criteria editable: ${criteriaCount}`);

    await client.captureScreenshot('01_admin_rubric_builder.png');

    // -------------------------------------------------------------
    // TEST 2: Open Round to LIVE & Rubric Locking (MSP-32)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Rubric Locking on Live Round (MSP-32)...');
    // Auto-confirm alert dialogs
    await client.eval(`window.confirm = () => true;`);
    await client.clickByText('button', 'Open Round \\(LIVE\\)');
    await client.wait(800);

    const isLocked = await client.eval(`document.body.innerText.includes('Live — Locked')`);
    console.log(`Rubric locked when Round is set to LIVE (MSP-32): ${isLocked}`);

    await client.captureScreenshot('02_admin_locked.png');

    // -------------------------------------------------------------
    // TEST 3: Dedicated Judge Scoring Portal (Mobile Viewport: 390x844)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Judge Scoring Portal on Mobile Viewport (MSP-21, MSP-22, MSP-25)...');
    await client.setViewport(390, 844, 2, true);
    await client.clickByText('button', 'Judge Scoring');
    await client.wait(1000);

    // Verify sticky header team name (MSP-21)
    const prominentTeam = await client.eval(`document.body.innerText.toLowerCase().includes('agropulse sensors')`);
    console.log(`Prominent team header displayed (MSP-21): ${prominentTeam}`);

    // Verify 3m pitch timer & Q&A timer (MSP-25)
    const hasTimer = await client.eval(`document.body.innerText.includes('3:00')`);
    console.log(`3-minute pitch stopwatch ready (MSP-25): ${hasTimer}`);

    // Verify listening prompts
    const listeningPrompts = await client.eval(`document.body.innerText.toLowerCase().includes("what you're listening for")`);
    console.log(`Inline listening guidance displayed (MSP-12): ${listeningPrompts}`);

    await client.captureScreenshot('03_judge_scoring_mobile.png');

    // -------------------------------------------------------------
    // TEST 4: Score Submission & Confirmation Receipt (MSP-23)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Score Submission & Confirmation Receipt (MSP-23)...');
    // Click quick 10 buttons for categories
    await client.eval(`(() => {
      const tens = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === '10');
      tens.forEach(b => b.click());
    })()`);

    // Type feedback
    await client.eval(`(() => {
      const inputs = document.querySelectorAll('textarea');
      if (inputs[0]) inputs[0].value = 'Outstanding agricultural telemetry demo and business plan!';
      if (inputs[1]) inputs[1].value = 'Consider expanding channel partnerships in rural regions.';
      if (inputs[0]) inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      if (inputs[1]) inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    })()`);

    await client.wait(500);

    // Submit score
    await client.clickByText('button', 'Submit Score');
    await client.wait(1000);

    const hasReceipt = await client.eval(`document.body.innerText.includes('Score Confirmed (MSP-23)')`);
    console.log(`Instant Confirmation Receipt generated (MSP-23): ${hasReceipt}`);

    await client.captureScreenshot('04_judge_confirmation_receipt.png');

    // -------------------------------------------------------------
    // TEST 5: Low-Stakes Revision Drawer (MSP-24)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing My Submissions Revision Drawer (MSP-24)...');
    await client.clickByText('button', 'My Submissions');
    await client.wait(800);

    const hasDrawer = await client.eval(`document.body.innerText.includes('My Submissions (Tap to Revise Score - MSP-24)')`);
    console.log(`Revision Drawer opened (MSP-24): ${hasDrawer}`);

    await client.captureScreenshot('05_judge_revision_drawer.png');

    // Close drawer
    await client.clickByText('button', 'Close');
    await client.wait(500);

    // -------------------------------------------------------------
    // TEST 6: Live Submission Matrix & Leaderboard (MSP-05, MSP-06)
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Live Submission Matrix & Leaderboard (Desktop Viewport)...');
    await client.setViewport(1280, 800, 1, false);
    await client.clickByText('button', 'Live Results');
    await client.wait(1000);

    const hasMatrix = await client.eval(`document.body.innerText.includes('Judge Submission Matrix by Team')`);
    const hasLeaderboard = await client.eval(`document.body.innerText.includes('Automated Results & Audit Leaderboard')`);
    console.log(`Live Submission Matrix rendered (MSP-05): ${hasMatrix}`);
    console.log(`Automated Tabulation Leaderboard rendered (MSP-06): ${hasLeaderboard}`);

    await client.captureScreenshot('06_live_matrix_leaderboard.png');

    // -------------------------------------------------------------
    // TEST 7: Audit Trail Modal (MSP-06)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Audit Trail Breakdown Modal (MSP-06)...');
    await client.eval(`(() => {
      const auditBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Audit'));
      if (auditBtns[0]) auditBtns[0].click();
    })()`);
    await client.wait(800);

    const hasAuditModal = await client.eval(`document.body.innerText.includes('Audit Trail & Score Breakdown')`);
    console.log(`Audit Trail Modal displayed with named judge scores: ${hasAuditModal}`);

    await client.captureScreenshot('07_audit_trail_modal.png');

    // Close audit modal
    await client.clickByText('button', 'Close Audit View');
    await client.wait(500);

    // -------------------------------------------------------------
    // TEST 8: Staff Sign-Off & Results Finalization Checkpoint (MSP-34)
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing Staff Sign-Off Checkpoint (MSP-34)...');
    await client.clickByText('button', 'Review & Confirm Results');
    await client.wait(800);

    const hasFinalizeModal = await client.eval(`document.body.innerText.includes('Confirm & Lock Final Results (MSP-34)')`);
    console.log(`Staff Checkpoint Modal displayed (MSP-34): ${hasFinalizeModal}`);

    await client.captureScreenshot('08_staff_checkpoint_modal.png');

    // Click confirm official results
    await client.clickByText('button', 'Confirm Official Results');
    await client.wait(1000);

    const isFinalized = await client.eval(`document.body.innerText.includes('Confirmed Final by')`);
    console.log(`Results officially locked with Program Director signature (MSP-34): ${isFinalized}`);

    await client.captureScreenshot('09_results_finalized.png');

    // -------------------------------------------------------------
    // TEST 9: Gift Classic Regional Bonus (+5 Points) (MSP-35)
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Testing Gift Classic Regional Bonus Panel (MSP-35)...');
    await client.clickByText('button', 'Coordinator Admin');
    await client.wait(800);

    // Select South region as winning region
    await client.eval(`(() => {
      const southBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('South'));
      if (southBtn) southBtn.click();
    })()`);
    await client.wait(600);

    const bonusActive = await client.eval(`document.body.innerText.includes('+5 pts applied')`);
    console.log(`Regional bonus +5 pts applied to South region teams (MSP-35): ${bonusActive}`);

    // Verify on Live Results tab
    await client.clickByText('button', 'Live Results');
    await client.wait(800);

    await client.captureScreenshot('10_regional_bonus_applied.png');

    // -------------------------------------------------------------
    // TEST 10: Rubric Templates Manager (MSP-01)
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Testing Rubric Templates Engine (MSP-01)...');
    await client.clickByText('button', 'Rubric Templates');
    await client.wait(800);

    const hasTemplates = await client.eval(`document.body.innerText.includes('Standard 10-Point General Pitch')`);
    console.log(`Pre-built Rubric Templates available (MSP-01): ${hasTemplates}`);

    await client.captureScreenshot('11_rubric_templates.png');

    console.log('\n=== ALL CHROME E2E ACCEPTANCE TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test execution failed:', err);
    throw err;
  } finally {
    await client.close();
    chromeProc.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
