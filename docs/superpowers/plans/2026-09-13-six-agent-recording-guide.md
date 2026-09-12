# Six Agent Recording Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append verified six-agent screenshots and a complete recording and voice-over runbook to the existing Word document.

**Architecture:** A Playwright capture script logs into the local expert portal, invokes the authenticated multi-agent API through the UI, and saves four evidence screenshots. A python-docx append script preserves the original document, adds structured sections and images, and the canonical renderer produces page PNGs for visual inspection.

**Tech Stack:** Google Chrome, Playwright, Node.js, python-docx, DOCX renderer.

## Global Constraints

- Preserve all existing content in `D:\矿业\图片.docx`.
- Use actual server-returned six-agent states.
- Do not describe data-similar records as verified accident cases.
- A4 must be described as dry-run and human-approved.
- The 70 to 45 comparison must not be presented as remediation causality.

---

### Task 1: Capture verified interface evidence

**Files:**
- Create: `tools/.generated/multi-agent-recording/*.png`
- Create: `tools/.generated/multi-agent-recording/results.json`

**Interfaces:**
- Consumes: local expert login and `/api/multi-agent/run`.
- Produces: four PNG screenshots and layout/API evidence.

- [ ] Start the local server on a dedicated port.
- [ ] Log in with the seeded expert account in Chrome.
- [ ] Capture the initial panel, run the workflow, then capture the result, A1 detail, and A4 detail.
- [ ] Verify node order, XGBoost provenance, A4 waiting state, no horizontal overflow, and no page errors.

### Task 2: Append screenshots and recording script

**Files:**
- Modify: `D:\矿业\图片.docx`
- Create temporarily: `D:\矿业\_tmp_append_recording_guide.py`

**Interfaces:**
- Consumes: Task 1 screenshots and the existing DOCX.
- Produces: a single integrated Word document.

- [ ] Back up the original document to a temporary recovery copy.
- [ ] Append a page break, six-agent overview, four figures with captions, recording checklist, shot table, voice-over script, and fallback notes.
- [ ] Confirm the document opens and contains the expected image and heading counts.

### Task 3: Render and inspect

**Files:**
- Create temporarily: `D:\矿业\_tmp_picture_docx_render\page-*.png`

**Interfaces:**
- Consumes: the integrated Word document.
- Produces: verified final DOCX only.

- [ ] Render the complete DOCX with the canonical renderer.
- [ ] Inspect every page for overlap, clipping, broken images, and awkward page breaks.
- [ ] Correct and re-render if any defect is found.
- [ ] Remove the temporary builder, recovery copy, and render output after verification.
