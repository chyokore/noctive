import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function captureScreenshots() {
  const artifactDir = path.join(
    'C:',
    'Users',
    'HP 840 G3',
    '.gemini',
    'antigravity',
    'brain',
    '8eebbe6f-a151-4db7-8614-fc0e4b21a00a'
  );
  const repoDocsDir = path.join(process.cwd(), 'docs', 'screenshots');
  const repoPublicDir = path.join(process.cwd(), 'public', 'screenshots');

  for (const dir of [artifactDir, repoDocsDir, repoPublicDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  console.log('Launching browser to capture competition verification screenshots...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pagesToCapture = [
    { name: 'landing_page.png', url: 'http://localhost:3000/' },
    { name: 'command_center.png', url: 'http://localhost:3000/command-center' },
    { name: 'decision_receipt_approved.png', url: 'http://localhost:3000/decision/rcpt-1788805371601-g52rb' },
    { name: 'decision_receipt_blocked.png', url: 'http://localhost:3000/decision/rcpt-1788805371607-hnx9i' },
    { name: 'replay_lab.png', url: 'http://localhost:3000/replay-lab' },
    { name: 'competition_paper_log.png', url: 'http://localhost:3000/competition-log' },
    { name: 'demo_scenarios.png', url: 'http://localhost:3000/demo-scenarios' },
  ];

  for (const item of pagesToCapture) {
    try {
      console.log(`Capturing ${item.name} from ${item.url}...`);
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000); // Allow animations/state to settle

      const targetPathArtifact = path.join(artifactDir, item.name);
      const targetPathDocs = path.join(repoDocsDir, item.name);
      const targetPathPublic = path.join(repoPublicDir, item.name);

      const buffer = await page.screenshot({ fullPage: false });
      fs.writeFileSync(targetPathArtifact, buffer);
      fs.writeFileSync(targetPathDocs, buffer);
      fs.writeFileSync(targetPathPublic, buffer);

      console.log(`Saved screenshot to artifact and repo: ${item.name}`);
    } catch (err: any) {
      console.error(`Failed to capture ${item.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

captureScreenshots().catch(console.error);

