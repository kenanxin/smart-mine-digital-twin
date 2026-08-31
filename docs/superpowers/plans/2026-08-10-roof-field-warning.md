# Roof Field Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the underground roof disaster warning demo visibly professional for competition video recording.

**Architecture:** Keep the current Three.js scene structure. Extend `roof-field-cloud.js` so the field visualization has two roof patches and stage-aware alpha; extend `main.js` and UI files for warning linkage.

**Tech Stack:** Native ES modules, Three.js, HTML/CSS, local Node syntax checks.

## Global Constraints

- Do not modify the surface scene in this task.
- Do not add unrelated disasters such as gas explosion.
- Keep the user-facing labels in Chinese.
- Avoid external paid or network-dependent assets.

---

### Task 1: Expand and tune roof field cloud

**Files:**
- Modify: `js/scene/mine-v2/roof-field-cloud.js`

**Interfaces:**
- Consumes: `createRoofFieldCloud()`, `updateRoofFieldCloud(group, stageId, mode, time, force)`
- Produces: visible roof field layers for intake roadway and working-face exit area.

Steps:
- Add multiple field patches with their own bounds and mesh transforms.
- Make alpha stage-aware: normal low, warning medium, danger high.
- Keep grid/contours/peak labels readable without blocking the tunnel.

### Task 2: Add warning linkage overlay

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: roof warning stage ids.
- Produces: `showRoofWarningPanel(stageId)` called whenever the stage changes.

Steps:
- Add HTML panel inside `threeContainer`.
- Add CSS for compact right-side warning card.
- Update `main.js` stage switching and demo sequence to refresh panel content.

### Task 3: Verify

**Files:**
- Check: `js/scene/mine-v2/roof-field-cloud.js`
- Check: `js/main.js`
- Check: `js/scene.js`

Steps:
- Run Node syntax checks.
- Open local page and capture normal, pressure, fall warning, stress, displacement views.
- Inspect screenshots for cloud visibility, panel obstruction, and obvious floating/over-model artifacts.
