# Clean Login Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the misleading login still with a clean capture of the current project roadway that contains no monitoring values or risk visualization.

**Architecture:** A dedicated Playwright script owns the reproducible capture procedure and writes the production JPEG. Existing login CSS continues to consume the same asset path, so authentication behavior and responsive layout remain unchanged.

**Tech Stack:** Node.js, Playwright, Three.js application runtime, Node test runner.

## Global Constraints

- Final image is `images/login-underground.jpg` at 1600x1000.
- No monitor label, numeric value, risk field, warning overlay, or business panel may appear in the image.
- Capture must use the current V2 underground focused-longwall scene and local full-quality assets.
- Credentials remain environment variables and are never committed.

---

### Task 1: Define and implement the clean capture contract

**Files:**
- Modify: `tests/auth-frontend.test.mjs`
- Create: `tools/capture-login-background.cjs`

**Interfaces:**
- Consumes: `LOGIN_CAPTURE_USERNAME`, `LOGIN_CAPTURE_PASSWORD`, optional `LOGIN_CAPTURE_PROXY`, and a local base URL.
- Produces: a 1600x1000 JPEG at `images/login-underground.jpg`.

- [x] **Step 1: Write a failing test for the dedicated capture script.**
- [x] **Step 2: Run `node --test tests/auth-frontend.test.mjs` and confirm the missing-script failure.**
- [x] **Step 3: Implement authenticated capture, hide every non-scene layer, and save JPEG quality 92.**
- [x] **Step 4: Start the local server and generate the production asset using environment-only credentials.**
- [x] **Step 5: Re-run the focused test and confirm it passes.**

### Task 2: Visual QA and delivery

**Files:**
- Modify: `images/login-underground.jpg`

**Interfaces:**
- Consumes: the clean scene JPEG from Task 1.
- Produces: the unchanged responsive login page with an accurate, label-free current roadway backdrop.

- [x] **Step 1: Capture desktop and mobile login screenshots at 1600x1000 and 390x844.**
- [x] **Step 2: Confirm current arched-roadway detail, no baked data, legible text, and no overlap.**
- [x] **Step 3: Run `node --test` and confirm the full suite passes.**
- [x] **Step 4: Commit and push `main` so Vercel rebuilds automatically.**
