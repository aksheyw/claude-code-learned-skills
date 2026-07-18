---
name: audit
description: Comprehensive codebase audit skill covering 10 systemic bug categories plus CI automation. Use this skill proactively during code review, E2E testing, pre-deployment checks, or whenever you spot any of these patterns — raw database values in UI (snake_case, camelCase enums, numeric codes), API contract mismatches between client and server, Firestore/database rules gaps, CORS missing production domains, analytics/consent gating features, dynamic Tailwind/CSS classes purged in prod, window.open without noopener, orphaned data on deletion, hardcoded secrets, Android/iOS security misconfigs, performance regressions (bundle size, re-renders, lazy loading), or accessibility gaps (missing aria labels, keyboard nav, screen reader). Also triggers on "audit this", "did you check everything", "is this production ready", "what did we miss", "are you sure", or any thoroughness question. One bug instance always means many more exist — this skill enforces the ripple search.
---

# Codebase Audit — 10-Category Systemic Bug Finder

This skill codifies hard-won lessons from production bugs. Every pattern here was discovered the hard way — usually one instance revealing many more across the codebase. Use it proactively, not reactively.

## How to Use This Skill

Pick the relevant audit category (or run all 10 for a pre-deploy check). Each category has:
- **Why it matters** — the real-world consequence
- **Detection** — how to find instances
- **The ripple search** — how one bug leads to more
- **Fix pattern** — the proven solution
- **Checklist** — verify completeness

---

## 1. Display Value Formatting

**The bug:** Database/API values stored as machine-readable keys (`bright_indirect`, `cactus_mix`, `glazed_ceramic`) leak into the UI without formatting.

**Why it's systemic:** The same field renders in multiple views (detail pages, cards, lists, settings). If one field leaks raw values, sibling fields almost certainly do too. In the original case, one `bright_indirect` bug turned into 9 fixes across 7 files.

### Detection

Scan for template expressions that render data fields without a formatting function:

```
# Red flags in rendered output:
{plant?.fieldName}           # React/JSX — raw field in display context
{{ item.field_name }}        # Vue/Angular/Handlebars
${data.fieldName}            # Template literals
```

**Visual red flags:**
- Underscores in user-facing text (`bright_indirect`, `cactus_mix`)
- camelCase in user-facing text (`needsAttention`, `highHumidity`)
- ALL_CAPS codes (`PENDING_REVIEW`, `AUTH_FAILED`)
- Numeric codes where labels expected (`status: 2`, `priority: 1`)

### Ripple Search

1. **Trace the field** to its source (API response, Firestore doc, form submission)
2. **Grep the entire codebase** for the field name — not just the file where the bug was found
3. **Check sibling fields** — if `lightNeeds` leaks, also check `potType`, `soilType`, `drainage`, `status`
4. **Check all output channels** — UI, email templates, push notifications, PDF exports, error messages, activity feeds

### Fix Pattern

Centralized formatter co-located with the data definition (single source of truth):

```
LOOKUP_TABLE = {
    "bright_indirect": { label: "Bright Indirect", ... },
    "low":             { label: "Low Light", ... },
}

function formatFieldName(key):
    if key is empty/null -> return sensible default
    if LOOKUP_TABLE has key -> return LOOKUP_TABLE[key].label
    else -> convert coded value to human-readable as fallback
```

Three properties: **null-safe**, **lookup-first**, **graceful fallback** for unknown keys.

**Fallback strategies:**

| Format | Strategy | Example |
|--------|----------|---------|
| `snake_case` | Split on `_`, capitalize each | `bright_indirect` -> `Bright Indirect` |
| `camelCase` | Split on uppercase, capitalize | `needsAttention` -> `Needs Attention` |
| `SCREAMING_SNAKE` | Split on `_`, capitalize first | `PENDING_REVIEW` -> `Pending Review` |
| Numeric codes | Must have explicit lookup | `2` -> `Active` |

**When NOT to format:** API responses, form values, admin/debug tools, technical identifiers, copy-to-clipboard.

### Anti-Patterns
- Inline `value.replace(/_/g, ' ')` scattered across components
- Inconsistent fallbacks (`{field || 'A'}` in one view, `{field || 'B'}` in another)
- Formatting at write time (storing "Bright Indirect" in DB breaks queries, sorting, i18n)

### Checklist
- [ ] Grepped entire codebase for all display locations of the field
- [ ] Checked sibling fields in the same data model
- [ ] Checked all output channels (UI, email, notifications, exports)
- [ ] Created or found centralized formatter (null-safe + fallback)
- [ ] Fixed ALL display locations, not just the reported one
- [ ] Removed duplicate local formatters
- [ ] Added unit tests (known keys, unknown keys, null/undefined)
- [ ] Updated test mocks for modules that re-export the formatter

---

## 2. API Contract Mismatch

**The bug:** Client and server disagree on request/response shape. Adding auth middleware server-side without updating client headers. Backend returning different field names than frontend expects.

**Why it's systemic:** Ship-stopper. In our case, adding `verifyFirebaseToken` to all API endpoints broke every API call because the client's API wrapper module never sent the `Authorization` header.

### Detection

```
# Find all fetch/axios calls and check headers
Grep for: fetch(, axios., .post(, .get(
Cross-reference with: server-side middleware (auth, validation, CORS)

# Find response field access patterns
Grep for: response.data., result., res.json
Cross-reference with: actual API response shapes
```

### Ripple Search

1. When ANY API endpoint changes auth/validation/shape, check ALL endpoints
2. Verify client sends all required headers (auth token, content-type)
3. Verify error handling matches on both sides
4. Check that response adapters are used (never read raw response paths in components)

### Fix Pattern

- **Response adapters** — normalize raw API responses into expected shapes (single adapter per endpoint)
- **Auth header injection** — centralize in one API client module, not per-call
- **Contract tests** — test that client request shape matches server expectations

### Checklist
- [ ] All endpoints checked after any auth/middleware change
- [ ] Client sends required headers (auth, content-type)
- [ ] Response adapters exist for every API endpoint
- [ ] Components use adapted responses, never raw
- [ ] Error shapes match on client and server

---

## 3. Firestore Rules & Subcollections

**The bug:** Parent collection has security rules but subcollections are silently denied by default. Deletion of parent document orphans subcollection data.

**Why it's systemic:** Firestore rules are NOT transitive. Every subcollection needs explicit rules. And `deleteDoc(parent)` does NOT cascade — subcollection data persists as orphans (GDPR risk).

### Detection

```
# Find all subcollection writes in code
Grep for: collection(db, 'parentCollection', parentId, 'subCollection')
Grep for: .doc().collection(

# Cross-reference with firestore.rules
# Every subcollection path must have a match block
```

### Ripple Search

1. List ALL subcollections from code (not just `firestore.rules`)
2. For each: verify explicit `match /{subcoll}/{docId}` rule exists
3. For each parent deletion: verify subcollection cleanup happens first
4. Check GDPR impact — can all user data be purged on account deletion?

### Fix Pattern

- **Explicit rules** for every subcollection in `firestore.rules`
- **Cascade deletion** — always query + delete subcollection docs before deleting parent
- **Use batch/transaction** for atomic cascade: query subcollection -> delete each -> delete parent
- **Fire-and-forget operations** (`.catch(() => {})`) should at minimum log failures

### Checklist
- [ ] Every subcollection in code has matching firestore.rules entry
- [ ] Parent deletion cascades to all subcollections
- [ ] Account deletion purges ALL user data (including subcollections)
- [ ] Silent failures (fire-and-forget) have at minimum error logging

---

## 4. CORS & Domain Configuration

**The bug:** CORS rules list dev domains (localhost, Firebase hosting) but omit the production domain. Breaks image uploads, API calls, and analytics collection from the live site.

**Why it's systemic:** Every external service has its own CORS config. Adding a new domain (or migrating to a new one) requires updating ALL of them.

### Detection

```
# Find all CORS configurations
Files to check:
  - Firebase Storage: cors.json
  - Vercel/API: api/_common.js or middleware
  - n8n webhooks: workflow CORS settings
  - Firebase Analytics: collection domain config
  - CDN/hosting: headers configuration
```

### Ripple Search

For EVERY domain serving your app, verify it appears in:
1. Firebase Storage CORS (`cors.json`)
2. API proxy CORS headers
3. n8n webhook allowed origins
4. CSP (Content Security Policy) headers
5. Image optimization domain allowlists

### Checklist
- [ ] Production domain in ALL CORS configs
- [ ] Dev domains NOT in production CORS configs
- [ ] All external service CORS configs audited
- [ ] New domain additions trigger full CORS sweep

---

## 5. Consent & Analytics Gating

**The bug:** App features are blocked when analytics consent is denied. Or worse: analytics cookies/tracking fire despite the user denying consent (GDPR violation).

**Why it's systemic:** Consent logic touches every analytics call, every page load, every user interaction that's tracked.

### Detection

```
# Find consent-gated code
Grep for: consentGranted, analyticsConsent, consent
Verify: NO feature logic is blocked by consent status
Verify: ALL trackEvent() calls are no-ops when consent denied

# Find cookie/tracking behavior
Test flow: deny consent -> check browser cookies -> verify no GA/analytics cookies set
```

### Ripple Search

1. Feature works identically with consent granted AND denied
2. No analytics cookies set when consent denied
3. `trackEvent()` calls are no-ops (not errors) when consent denied
4. Consent state persists across sessions
5. Consent can be changed after initial choice

### Checklist
- [ ] App fully functional with consent denied
- [ ] Zero analytics cookies when consent denied
- [ ] trackEvent() no-ops gracefully (no errors)
- [ ] Consent persists across sessions
- [ ] Consent is revocable

---

## 6. Dynamic CSS Class Purging

**The bug:** Template literal CSS classes (`bg-${color}-500/10`) work in dev but are purged in production builds. Tailwind's purger can't parse dynamic class construction.

**Why it's systemic:** Every new color-coded feature risks this. Developers see it working in dev and ship broken styling to prod.

### Detection

```
# Find dynamic Tailwind classes
Grep for regex: \$\{.*\}.*(bg-|text-|border-|ring-)
Grep for regex: `(bg|text|border|ring)-\$\{

# Also check for:
className={`text-${status === 'good' ? 'green' : 'red'}-400`}
```

### Fix Pattern

Replace dynamic class construction with static class maps:

```javascript
// BAD: purged in production
className={`bg-${color}-500/10`}

// GOOD: all classes visible to purger
const COLOR_CLASSES = {
  water: 'bg-blue-500/10 text-blue-400',
  fertilize: 'bg-green-500/10 text-green-400',
  prune: 'bg-amber-500/10 text-amber-400',
};
className={COLOR_CLASSES[action]}
```

### Checklist
- [ ] Zero template literal class names with dynamic color/size values
- [ ] All conditional classes use static maps or ternaries with full class strings
- [ ] Production build visually verified (not just dev)

---

## 7. Security Hygiene

**The bug:** Multiple security issues that individually seem minor but compound: `window.open` without `noopener`, cleartext traffic in production, hardcoded secrets, missing minification.

### Detection Checklist

**Browser security:**
- [ ] All `window.open('url', '_blank')` have third param `'noopener,noreferrer'`
- [ ] External links don't leak user data in URL params (uid, tokens)
- [ ] No `javascript:` URLs or `eval()` usage

**Mobile/native security:**
- [ ] `android:usesCleartextTraffic="false"` in AndroidManifest.xml
- [ ] `network_security_config.xml` only allows cleartext for localhost in debug
- [ ] `minifyEnabled true` in release build type
- [ ] Release keystore backed up securely

**Secrets:**
- [ ] No API keys, passwords, or tokens in source code
- [ ] No secrets in git history (`git log --all -p | grep -i 'password\|api_key\|secret'`)
- [ ] All secrets in environment variables or secret manager
- [ ] Service worker SDK versions match app dependency versions

**Third-party:**
- [ ] `window.open` uses `noopener,noreferrer`
- [ ] URLs with user data (uid, tokens) don't go to third parties
- [ ] CSP headers configured for production

---

## 8. Test & Mock Completeness

**The bug:** Adding a new export to a module breaks all tests that mock that module — the mock doesn't include the new export, so components crash with `undefined is not a function`.

**Why it's systemic:** Every test file that mocks the changed module needs updating. Miss one and CI passes but that test file is actually broken.

### Detection

When you add a new export to any module:
```
# Find all mocks of the changed module
Grep for: vi.mock('path/to/module')
Grep for: jest.mock('path/to/module')

# Each mock must include the new export
```

### Ripple Search

1. New function added to `physicsEngine.js` -> check ALL files that `vi.mock('../../lib/physicsEngine')`
2. New export from a hook -> check all test files mocking that hook
3. Changed function signature -> check all mocks match new params

### Fix Pattern

When adding exports:
1. Add the export
2. Immediately grep for all mocks of that module
3. Add the new export to every mock
4. Run full test suite (not just the file you changed)

### Checklist
- [ ] Grepped for all mocks of the changed module
- [ ] Every mock includes the new export with correct signature
- [ ] Full test suite passes (not just changed files)
- [ ] Mock behavior matches real implementation for edge cases (null, undefined)

---

## 9. Performance & Bundle Health

**The bug:** App ships with massive bundles, unnecessary re-renders, unoptimized images, and no lazy loading. Users on slow connections (India 3G/4G) see 10+ second load times or blank screens.

**Why it's systemic:** Performance debt accumulates silently. Each new feature adds weight. By the time someone notices, the entire app is slow.

### Detection

```
# Bundle analysis
npx vite-bundle-visualizer          # Vite
npx webpack-bundle-analyzer         # Webpack
npx next build && npx @next/bundle-analyzer  # Next.js

# Find missing lazy loading
Grep for: import .* from '.*/pages/    # Direct page imports (should be React.lazy)
Grep for: import .* from '.*/components/  # Large component imports

# Find unnecessary re-renders (React)
# In browser DevTools: React Profiler > "Why did this render?"
# Or add React.memo() tracking
```

### Ripple Search

1. **Lazy loading** — every route-level page component should use `React.lazy()` or dynamic `import()`
2. **Heavy dependencies** — check `node_modules` for duplicate packages or oversized libraries (moment.js, lodash full import vs lodash-es)
3. **Image optimization** — all user-uploaded images should be resized/compressed before display; use `srcset` or `<picture>` for responsive images
4. **Re-render chains** — one unnecessary re-render at the top of a component tree cascades to every child
5. **Network waterfall** — sequential API calls that could be parallel; missing `Promise.all()`

### Fix Patterns

```javascript
// Lazy loading routes
const PlantDetail = React.lazy(() => import('./pages/PlantDetail'));

// Tree-shakeable imports
import { debounce } from 'lodash-es';  // NOT: import _ from 'lodash'

// Memoize expensive computations
const sortedPlants = useMemo(() => plants.sort(...), [plants]);

// Parallel API calls
const [plants, sites] = await Promise.all([fetchPlants(), fetchSites()]);
```

### Checklist
- [ ] Bundle size measured and baselined (record in project docs)
- [ ] All route pages lazy-loaded
- [ ] No full library imports where tree-shakeable alternatives exist
- [ ] Images optimized (compressed, responsive, lazy-loaded below fold)
- [ ] No sequential API calls that could be parallel
- [ ] Network status detection for slow/offline connections
- [ ] Loading skeletons for async content (not blank screens)

---

## 10. Accessibility (a11y)

**The bug:** Interactive elements missing labels, keyboard navigation broken, screen readers can't parse the page, color contrast insufficient. Excludes users and fails compliance audits.

**Why it's systemic:** Accessibility is rarely tested during development. Once you find one gap, the entire app likely has dozens more — every custom component, every modal, every form.

### Detection

```
# Automated scanning
npx axe-core         # Run axe accessibility checker
npx pa11y            # CLI accessibility tester
# Browser: Chrome DevTools > Lighthouse > Accessibility

# Manual checks
Grep for: onClick.*div     # Clickable divs without role="button" + tabIndex
Grep for: onClick.*span    # Same pattern
Grep for: <img(?!.*alt)    # Images missing alt text
Grep for: aria-            # Verify aria attributes are correct (not just present)
```

### Ripple Search

1. **Interactive elements** — every clickable element needs `role`, `tabIndex`, `aria-label` (or visible label), and keyboard event handlers (`onKeyDown` for Enter/Space)
2. **Form fields** — every input needs an associated `<label>` or `aria-label`
3. **Modals/sheets** — need focus trap, Escape to close, `aria-modal="true"`, return focus on close
4. **Color contrast** — all text must meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
5. **Motion** — respect `prefers-reduced-motion` for all animations
6. **Screen reader** — page structure uses semantic HTML (`<nav>`, `<main>`, `<section>`, `<h1>`-`<h6>` in order)

### Fix Patterns

```jsx
// BAD: inaccessible clickable div
<div onClick={handleClick} className="cursor-pointer">Click me</div>

// GOOD: accessible button
<button onClick={handleClick} aria-label="Add plant">Click me</button>

// Or if it must be a div:
<div onClick={handleClick} onKeyDown={(e) => e.key === 'Enter' && handleClick()}
     role="button" tabIndex={0} aria-label="Add plant">Click me</div>

// Reduced motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### Checklist
- [ ] Lighthouse accessibility score > 90
- [ ] All interactive elements keyboard-navigable (Tab, Enter, Escape)
- [ ] All images have meaningful alt text (or `alt=""` for decorative)
- [ ] All form inputs have associated labels
- [ ] Modals trap focus and return it on close
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Semantic HTML structure (`nav`, `main`, `h1`-`h6` hierarchy)
- [ ] `aria-live` regions for dynamic content updates (toasts, notifications)

---

## Framework-Specific Detection Commands

Different frameworks expose raw values differently. Use these grep patterns per framework:

### React / JSX
```
# Raw field in display context
Grep: {(plant|item|data|user|site)\?\.\w+}
Grep: {(plant|item|data|user|site)\.\w+}
# Exclude: onClick, onChange, key=, ref=, className= contexts
```

### Vue / Angular / Svelte
```
# Vue: {{ object.field }}
Grep: \{\{\s*(plant|item|data|user)\.\w+\s*\}\}

# Angular: {{ object.field }}
Grep: \{\{\s*(plant|item|data|user)\.\w+\s*\}\}

# Svelte: {object.field}
Grep: \{(plant|item|data|user)\.\w+\}
```

### Python (Django / Flask / FastAPI)
```
# Template rendering
Grep: \{\{\s*(object|item|record)\.\w+\s*\}\}     # Django/Jinja2
Grep: f".*\{(obj|item|record)\.\w+\}"              # f-strings in responses

# Django model __str__ returning raw field
Grep: def __str__.*return self\.\w+
```

### Backend API Responses
```
# Returning raw enum/status values to frontend
Grep: 'status':\s*(self|obj|record)\.\w+
Grep: jsonify.*status.*=.*\.status
```

---

## CI/CD Automation

Integrate these checks into your CI pipeline so they run automatically on every PR:

### GitHub Actions Example

```yaml
name: Audit Checks
on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Category 1: Display values — grep for raw field access
      - name: Check for raw database values in JSX
        run: |
          # Flag potential raw value display (manual review needed)
          grep -rn --include="*.jsx" --include="*.tsx" \
            '{plant\?\.\(potType\|soilType\|lightNeeds\|drainage\|status\)' \
            src/ && echo "::warning::Possible raw database values in UI" || true

      # Category 6: Dynamic Tailwind classes
      - name: Check for dynamic Tailwind classes
        run: |
          grep -rn --include="*.jsx" --include="*.tsx" \
            'bg-\${.*}\|text-\${.*}\|border-\${.*}' \
            src/ && exit 1 || echo "No dynamic Tailwind classes found"

      # Category 7: Security — window.open
      - name: Check window.open security
        run: |
          grep -rn --include="*.jsx" --include="*.tsx" --include="*.js" \
            "window.open.*'_blank'" src/ | \
            grep -v "noopener" && exit 1 || echo "All window.open calls secure"

      # Category 7: Secrets in source
      - name: Check for hardcoded secrets
        run: |
          grep -rn --include="*.js" --include="*.jsx" --include="*.ts" \
            'sk-\|api_key.*=.*"\|password.*=.*"' \
            src/ api/ && exit 1 || echo "No hardcoded secrets found"

      # Category 8: Test suite
      - name: Run full test suite
        run: npx vitest run

      # Category 10: Accessibility
      - name: Lighthouse accessibility audit
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: http://localhost:3000
          configPath: .lighthouserc.json
```

### Pre-Commit Hook (Local)

```bash
#!/bin/sh
# .husky/pre-commit — run before every commit

# Check for dynamic Tailwind classes
if grep -rn 'bg-\${.*}\|text-\${.*}' --include="*.jsx" src/; then
  echo "ERROR: Dynamic Tailwind classes found. Use static class maps."
  exit 1
fi

# Check for window.open without noopener
if grep -rn "window.open.*'_blank'" --include="*.jsx" --include="*.js" src/ | grep -v "noopener"; then
  echo "ERROR: window.open missing noopener,noreferrer"
  exit 1
fi

# Check for console.log
if grep -rn "console\.log" --include="*.jsx" --include="*.js" src/lib/ src/pages/ src/components/; then
  echo "WARNING: console.log found — use logger utility instead"
fi
```

### What to Automate vs. Manual Review

| Check | Automate? | Why |
|-------|-----------|-----|
| Dynamic Tailwind classes | Yes | Pure pattern match, zero false positives |
| window.open security | Yes | Pure pattern match |
| Hardcoded secrets | Yes | Pattern match + git history scan |
| Bundle size threshold | Yes | `size-limit` or `bundlesize` packages |
| Test suite passes | Yes | Standard CI |
| Lighthouse a11y score | Yes | Automated scoring |
| Raw display values | Partial | Can flag candidates, but needs human judgment |
| API contract match | No | Requires cross-referencing client + server |
| CORS config | No | Requires checking external service configs |
| Consent behavior | No | Requires manual browser testing |

---

## Pre-Deployment Full Audit

Run all 10 categories before any production deployment:

| # | Category | Quick Command |
|---|----------|--------------|
| 1 | Display values | Grep for raw field access in JSX/template display contexts |
| 2 | API contracts | Diff client headers vs server middleware requirements |
| 3 | Firestore rules | List code subcollections, cross-ref with `firestore.rules` |
| 4 | CORS | Check all external service CORS for production domain |
| 5 | Consent | Test full app flow with consent denied |
| 6 | Dynamic CSS | Grep for template literal Tailwind classes |
| 7 | Security | Run checklist above |
| 8 | Test mocks | Run full test suite, check for undefined function errors |
| 9 | Performance | Bundle analysis + lazy loading check + image audit |
| 10 | Accessibility | Lighthouse a11y audit + keyboard nav + screen reader test |

## Meta-Lesson: The Ripple Search

The single most important audit principle: **one bug instance always means many more.** When you find any bug from the categories above:

1. **Same field, all views** — grep the entire codebase, not just the file
2. **Sibling fields** — if `lightNeeds` leaks, also check `potType`, `soilType`, etc.
3. **Same pattern, other entities** — if `plant.status` leaks, check `site.status`, `user.tier`
4. **All output channels** — UI, email, push notifications, exports, error messages

Never fix just the reported instance. The skill to develop is: from one bug, discover the systemic pattern, then fix every instance at once.

## Iterative Depth

Single-pass review catches 0-2 bugs. Iterative pushback catches all of them. In the audit that originated this skill, 28 rounds of review found 14 production bugs (2 ship-stoppers, 4 HIGH, 8 MEDIUM) that single-pass review missed entirely.

The rule: review is not "complete" until a full round produces zero new findings.
