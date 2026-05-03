---
name: safety-circuit-appraisal
description: Pre-certification safety circuit appraisal for electronic hardware: parses a schematic + BOM, identifies safety-critical components and isolation barriers, performs single-fault analysis (open / short) on each, checks component ratings against the requirements of a safety standard (IEC 62368-1 by default; IEC 61010, IEC 60601-1, UL 60950 on request), and produces a structured Markdown report with recommendations. Orchestrates `pdf-reader`, `schematic-intelligence`, `power-electronics`, `circuit-solver`, and `datasheet-intelligence`. Trigger for asks like "safety circuit appraisal", "single fault analysis", "SFA", "FMEA on this circuit", "evaluate circuit safety", "IEC 62368", "IEC 61010", "pre-compliance review", "isolation barrier analysis", or "certification readiness".
---

# Safety Circuit Appraisal

This skill guides an AI agent to perform a comprehensive Safety Circuit Appraisal for electronic products, focusing on single-fault tolerance analysis as required by safety standards like IEC 62368-1. It uses a combination of schematic analysis, component data, and established safety principles to identify and evaluate potential hazards.

## Core Workflow

### Phase 1: Setup and Information Gathering

1.  **Confirm Scope and Gather Inputs:**
    *   Greet the user and confirm the goal: to perform a Safety Circuit Appraisal.
    *   Request the necessary documents:
        *   The complete product **schematic** (in PDF format).
        *   The **Bill of Materials (BOM)**, preferably in a structured format like CSV or XLSX.
    *   Ask the user to specify the primary safety standard to be considered (e.g., IEC 62368-1) and the mains voltage the equipment is designed for.

2.  **Parse and Understand the Design:**
    *   Use the `pdf-reader` skill to extract text and image data from the schematic PDF.
    *   Use the `schematic-intelligence` skill to interpret the circuit diagram, identifying functional blocks (e.g., power supply, control logic, I/O), connections, and component labels.
    *   Parse the BOM to create a component list with part numbers, descriptions, and circuit references (e.g., C1, R5, U3).

### Phase 2: Hazard Analysis and Critical Component Identification

3.  **Identify Safety-Critical Circuits and Components:**
    *   Load and consult `references/identifying-safety-critical-components.md`.
    *   Analyze the schematic to identify circuits and components that serve a safety function. Key areas include:
        *   **Primary Circuits:** Anything connected directly to the mains input.
        *   **Isolation Barriers:** Transformers, optocouplers, and physical insulation separating hazardous voltages from user-accessible parts (SELV/TNV circuits).
        *   **Protective Devices:** Fuses, fusible resistors, circuit breakers, MOVs, TVS diodes.
        *   **Interlocks:** Switches that disable power when an enclosure is opened.
        *   **High-Energy Circuits:** Large capacitors, inductive components.
    *   Create a list of these critical components.

### Phase 3: Single-Fault Simulation and Effects Analysis

4.  **Perform Single-Fault Analysis (SFA):**
    *   Load and consult `references/single-fault-analysis-methods.md`.
    *   For each component on the critical components list, simulate two failure modes:
        *   **Open-Circuit:** The component is removed or fails open.
        *   **Short-Circuit:** The component's terminals are shorted together.
    *   **Analyze the Effect:** For each simulated fault, determine the consequence. Use the `power-electronics` and `circuit-solver` skills to reason about circuit behavior.
        *   Does the fault cause a downstream component to fail?
        *   Does a protective device (fuse) operate as expected?
        *   Is the isolation barrier compromised? (e.g., shorting an optocoupler's transistor).
        *   Could the fault lead to a hazard (fire, shock, energy release)?
    *   **Record Findings:** Document the cause (e.g., "R12 shorts"), the effect ("Fuse F1 opens"), and the safety outcome ("Hazard mitigated").

5.  **Evaluate Component Ratings:**
    *   For critical components identified (especially on the BOM), use the `datasheet-intelligence` skill to find and check their specifications against the application requirements.
    *   **Example Checks:**
        *   Is the fuse rating appropriate for the expected current?
        *   Is the X/Y capacitor voltage rating sufficient for the mains voltage?
        *   Does the transformer's insulation rating meet the standard's requirements for the working voltage?

### Phase 4: Reporting

6.  **Generate the Appraisal Report:**
    *   Load and follow the structure in `references/generating-the-report.md`.
    *   Compile all findings into a structured report that includes:
        *   An executive summary.
        *   A list of all identified safety-critical components.
        *   A detailed table of the Single-Fault Analysis (Component, Fault Mode, Effect, Outcome).
        *   A section on component rating compliance.
        *   A list of non-compliances and recommendations for mitigation.
    *   Present the report to the user in Markdown format.

## Reference Guide

| Topic | Reference | When to load |
|-------|-----------|--------------|
| Introduction to Safety Appraisal | `references/introduction-to-safety-appraisal.md` | At the beginning of the task to understand the goals. |
| Identifying Safety-Critical Components | `references/identifying-safety-critical-components.md` | During Phase 2 for hazard analysis. |
| Single-Fault Analysis Methods | `references/single-fault-analysis-methods.md` | During Phase 3 for detailed failure simulation. |
| Generating the Report | `references/generating-the-report.md` | During Phase 4 to structure the final output. |

## Constraints

**MUST DO**
- Always perform the analysis in the context of a specific safety standard (e.g., IEC 62368-1). If the user doesn't provide one, default to IEC 62368-1 and state this assumption.
- Clearly state all assumptions made during the analysis (e.g., "Assuming C5 is a properly rated Y-capacitor").
- When a fault's outcome is ambiguous, flag it as requiring physical testing.
- The analysis is a simulation. Remind the user that these results must be verified by a qualified safety engineer through physical testing.

**MUST NOT DO**
- Do not declare a product "safe" or "certified." This skill provides an appraisal and identifies potential non-compliances for further investigation.
- Do not analyze for issues beyond single-fault conditions (e.g., multiple simultaneous faults).
- Do not perform analysis without both a schematic and a BOM.

## When NOT to use this skill

This skill is heavyweight and orchestrates several others. Defer to a more
focused skill when the request is narrower:

- The user just wants to **read a schematic PDF** with no compliance angle
  → `pdf-reader` + `schematic-intelligence` directly.
- The user wants to **look up a single component's ratings** from a
  datasheet → `datasheet-intelligence`.
- The user wants to **simulate or solve a circuit** numerically (steady
  state, transients, frequency response) → `circuit-solver`,
  `power-electronics`, or `simulation-verification`.
- The user wants **functional safety in software** (ISO 26262 SW units,
  MISRA-C, freedom-from-interference at the code level) — that's a
  different domain than electronic hardware single-fault analysis.
- The user is asking about **EMC pre-compliance, thermal margin, or
  mechanical enclosure ratings** — those are separate compliance
  exercises that this skill does not cover.
- **You don't have both the schematic and the BOM.** Ask for the missing
  artifact first instead of running the workflow with assumptions.

## Output Template

```markdown
# Safety Circuit Appraisal Report for [Product Name]

**Standard Used:** [e.g., IEC 62368-1]
**Assumed Mains Voltage:** [e.g., 230VAC]

### 1. Executive Summary

A brief overview of the findings, highlighting any major non-compliances discovered.

### 2. Safety-Critical Component List

- **F1:** Main input fuse.
- **T1:** Isolation transformer.
- **OC1:** Optocoupler in feedback loop.
- **CX1:** X-capacitor across line and neutral.
- ...

### 3. Single-Fault Analysis (SFA)

| Component | Fault Mode | Predicted Effect | Hazard Analysis | Outcome |
|-----------|------------|------------------|-----------------|---------|
| **OC1**   | Short (C-E) | Feedback loop is defeated, output voltage may rise. | Over-voltage on secondary could be a fire or energy hazard. | **FAIL** (Requires further protection, like an over-voltage crowbar circuit). |
| **F1**    | Open       | Unit loses power. | No hazard. | **PASS** |
| **R5**    | Short      | ...              | ...             | ...     |

### 4. Component Rating Evaluation

- **F1:** Rating appears appropriate for declared max input current.
- **CX1:** Marked as a 275VAC X2-rated part, which is compliant for 230VAC mains.
- **T1:** **[INSUFFICIENT DATA]** Insulation class and working voltage rating could not be determined from BOM. Requires verification.

### 5. Recommendations

- **[CRITICAL]** Add an independent over-voltage protection circuit (e.g., Zener crowbar) on the secondary output to protect against feedback failure (see SFA for OC1).
- **[INFO]** Verify the insulation rating of transformer T1 meets the requirements for basic/reinforced insulation as per IEC 62368-1.
- ...

---
***Disclaimer:** This is an automated appraisal and not a substitute for a formal safety analysis and physical testing by a qualified engineer.*
```
