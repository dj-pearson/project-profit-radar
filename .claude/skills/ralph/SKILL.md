---
name: ralph
description: "Convert PRDs to prd.json format for the Ralph autonomous agent system. Use when you have an existing PRD and need to convert it to Ralph's JSON format. Triggers on: convert this prd, turn this into ralph format, create prd.json from this, ralph json."
user-invocable: true
---

# Ralph PRD Converter

Converts existing PRDs to the `scripts/ralph/prd.json` format that Ralph uses for autonomous execution.

---

## The Job

Take a PRD (markdown file or text) and convert it to `scripts/ralph/prd.json`.

---

## Output Format

```json
{
  "project": "[Project Name]",
  "branchName": "ralph/[feature-name-kebab-case]",
  "description": "[Feature description from PRD title/intro]",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2",
        "npm run build passes",
        "npm run lint passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## Story Size: The Number One Rule

**Each story must be completable in ONE Ralph iteration (one context window).**

### Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a filter dropdown to a list

### Too big (split these):
- "Build the entire dashboard" → Split into: schema, queries, UI components, filters
- "Add authentication" → Split into: schema, middleware, login UI, session handling
- "Refactor the API" → Split into one story per endpoint or pattern

**Rule of thumb:** If you cannot describe the change in 2-3 sentences, it is too big.

---

## Story Ordering: Dependencies First

Stories execute in priority order. Earlier stories must not depend on later ones.

**Correct order:**
1. Schema/database changes (migrations in `supabase/migrations/`)
2. Supabase types update (`src/integrations/supabase/types.ts`)
3. Server actions / backend logic / Edge Functions
4. React hooks and TanStack Query hooks
5. UI components that use the backend
6. Dashboard/summary views that aggregate data

---

## Acceptance Criteria: Must Be Verifiable

### Good criteria (verifiable):
- "Add `status` column to tasks table with default 'pending'"
- "Filter dropdown has options: All, Active, Completed"
- "`npm run build` passes"
- "`npm run lint` passes"

### Bad criteria (vague):
- "Works correctly"
- "User can do X easily"
- "Handles edge cases"

### Always include as final criteria for every story:
```
"npm run build passes",
"npm run lint passes"
```

### For stories that change UI, also include:
```
"Verify in browser using dev-browser skill"
```

---

## Archiving Previous Runs

**Before writing a new prd.json, check if there is an existing one from a different feature:**

1. Read the current `scripts/ralph/prd.json` if it exists
2. Check if `branchName` differs from the new feature's branch name
3. If different, archive to `scripts/ralph/archive/YYYY-MM-DD-feature-name/`

The ralph.sh script handles archiving automatically on the next run.

---

## Checklist Before Saving

- [ ] Each story is completable in one iteration (small enough)
- [ ] Stories are ordered by dependency (schema → types → backend → UI)
- [ ] Every story has `"npm run build passes"` and `"npm run lint passes"` criteria
- [ ] UI stories have `"Verify in browser using dev-browser skill"` criteria
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] No story depends on a later story
- [ ] Saved to `scripts/ralph/prd.json`
