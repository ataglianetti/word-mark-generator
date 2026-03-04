# Word Mark Generator

## Overview
Web App: Interactive word mark / logotype generator with customizable text effects, font selection, color palettes, and high-res export.
Stack: TypeScript + React + Vite + Tailwind CSS v4

## Architecture
Originally pulled from a Figma Make file. Single-page React app — all logic lives in `src/app/App.tsx`.

### Key Systems
- **Stackable effects:** Array of `EffectInstance` objects. Each has type, per-letter targeting (All/Select), and amount. Effects compose per-character via CSS transforms, filters, and text-shadows.
- **URL state persistence:** All settings serialized to query params for shareable links. Effects use pipe-delimited format.
- **Canvas export:** Offscreen canvas at 4x resolution, transparent background, per-character rendering with kerning and all active effects applied.
- **Bokeh circles:** Random decorative circles with color-matched palette, opacity, and blur.

### Files
- `src/app/App.tsx` — entire application (component, state, effects logic, canvas export)
- `src/styles/` — Tailwind config, theme, Google Fonts imports
- `src/main.tsx` — React entry point
- `index.html` — Vite entry

### Effect Types
flip, blur, stroke, shadow, glow, emboss — each with configurable amount and per-letter targeting.

## Web App Conventions
- Component structure: single-file app (no component split yet)
- State management: React useState with URL param sync
- Styling: Tailwind utilities + inline styles for dynamic values
- No tests, no linting configured — prototype/tool stage

## Agent Orchestration

### When to Use Agents vs Direct Work

| Task Size | Approach | Example |
|-----------|----------|---------|
| Trivial (<10 lines, one file) | Direct edit | Fix a typo, tweak a color |
| Small (one feature, 1-3 files) | Direct edit or single agent | Add a new effect type |
| Medium (feature, 3-8 files) | Planner → Implementer | Extract components, add routing |
| Large (cross-cutting, 8+ files) | Research → Plan → Implement (waves) → Verify → Review | Themes system, component library extraction |

### How to Spawn Agents

1. Read the agent template from `.claude/agents/{agent}.md`
2. Use the Task tool with the template as part of the prompt
3. Include relevant context (codebase docs, prior agent output, specific files)
4. Set model based on current profile (see Model Profiles below)

### Wave Execution

For multi-task plans from the planner:
1. Execute all tasks in Wave 1 in parallel (separate Task calls in one message)
2. Wait for Wave 1 to complete
3. Review results — adjust Wave 2 if needed
4. Execute Wave 2 tasks in parallel
5. Repeat until plan is complete
6. Run verifier against the original goal

### Model Profiles

Current profile is set in `.planning/STATE.md`. Default: `balanced`.

| Profile | Researcher | Planner | Implementer | Verifier | Debugger | Reviewer | Mapper |
|---------|-----------|---------|-------------|----------|----------|----------|--------|
| `quality` | opus | opus | opus | sonnet | opus | sonnet | sonnet |
| `balanced` | opus | opus | sonnet | sonnet | opus | sonnet | haiku |
| `budget` | sonnet | sonnet | sonnet | haiku | sonnet | haiku | haiku |

## Context Budget

### When to Spawn Fresh Agents
- Investigation is getting long (10+ file reads without clear direction)
- Switching from one subsystem to another
- After completing a wave — fresh context for each wave

### Save State Before Switching
When moving between tasks or subsystems, update `.planning/STATE.md`:
- What was just completed
- What's next
- Any blockers or open questions

## Worktree Patterns

### When to Use Worktrees
- Parallel implementation of independent features
- Exploratory changes that might be thrown away
- When two tasks touch the same files (avoid conflicts)

### Workflow
1. Use `isolation: "worktree"` parameter on Task tool
2. Agent works in isolated copy of the repo
3. If changes are good, merge the worktree branch
4. If changes are bad, discard the worktree
