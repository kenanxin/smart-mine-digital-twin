# Roof Disaster Visual QA Notes

Date: 2026-08-17

Scope: six-stage underground roof-disaster demo at
`http://localhost:8080/?scene=v2&view=underground`.

## Reliable QA Path

Use system Chrome through Playwright in headed mode with the installed Chrome executable:

```powershell
& 'C:\Users\欣\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' -e "<script>"
```

Run from:

```text
C:\Users\欣\.cache\codex-runtimes\codex-primary-runtime\dependencies\node
```

Launch with:

```js
const { chromium } = require('playwright');
const browser = await chromium.launch({
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--start-maximized', '--disable-session-crashed-bubble'],
});
```

Capture fixed viewport screenshots, wait about 8.5 seconds after each stage URL:

```js
const page = await browser.newPage({ viewport: { width: 1707, height: 1067 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(8500);
await page.screenshot({ path });
```

## Stage URLs

- `stage=normalMonitor&field=stress`
- `stage=roofPressureRise&field=stress`
- `stage=roofSeparationAlarm&field=displacement`
- `stage=supportResistanceAlarm&field=risk`
- `stage=roofFallWarning&field=risk`
- `stage=emergencyResponse&field=risk`

## Avoid These Paths

- Do not use headless browser screenshots to judge the 3D scene. WebGL rendered blank or misleading in prior checks.
- Do not rely on desktop screenshots of an unfocused Chrome window. They captured Codex panels, selected address bars, restore prompts, or the wrong tab.
- Do not open repeated normal Chrome windows for QA. Chrome reused old sessions and showed restore/login prompts.
- Do not judge cloud visibility from file size alone. Open the image and inspect the 3D content.
- Do not treat contour-line fixes as complete until checking `scene.js` disaster effects and monitor geometry too; several coarse lines came from scene effects and monitoring objects, not the cloud module.

## Visual Pass Criteria

- No selected address bar, Chrome restore prompt, or Codex UI in screenshots.
- The 3D scene is nonblank and shows the underground view for all six stages.
- Central risk score and right-side roof-risk score are consistent for the selected stage.
- Cloud field is visible but not a full-screen colored sheet.
- Low stress remains visible as green/cyan, not transparent.
- Risk hotspots are localized to plausible support/roof zones in late stages.
- No thick red/white diagonal lines dominate the scene.
- Peak marker is readable but does not cover the cloud field.
- Right-side risk trend card is fully visible with no label overlap.

## Current Known Design Choice

The cloud is a frontend engineering demo field generated from staged IDW/Gaussian profiles. It is not backend finite-element or production sensor interpolation. During narration, describe it as a simulated spatial warning field tied to staged roof-pressure, displacement, and support-resistance states.
