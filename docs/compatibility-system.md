# VoltForge — Compatibility System

## Overview

The compatibility system evaluates whether selected parts are physically compatible with each other and surfaces issues to the user in real time. It is implemented as a **pure function** in `src/lib/compatibility.ts` and is called automatically every time the user changes a part selection.

---

## Architecture

```
useConfiguratorStore.setPart(category, part)
        │
        └──► evaluateCompatibility(newParts: Record<PartCategory, Part | null>)
                    │
                    └──► CompatibilityIssue[]
                                │
                                └──► stored in issues[] in Zustand
                                            │
                                            └──► Sidebar renders banners
```

The function is isolated from UI concerns. It receives the full parts record and returns an array of issues — no side effects, no imports beyond types. This makes it trivially testable (no mocking needed) and safe to extend.

---

## Data Structures

### `Part.specs`

Parts carry arbitrary metadata in a `specs: Record<string, string | number | boolean | string[]>` field. The compatibility function reads specific keys from this bag. Current keys in use:

| Key | Type | Used on | Meaning |
|---|---|---|---|
| `mount_type` | `string` | frame, motor | Physical mounting interface. Must match between frame and motor. |
| `voltage` | `number` | battery | Nominal voltage of the battery pack |
| `max_voltage` | `number` | controller | Maximum safe input voltage for the controller |
| `min_voltage` | `number` | controller | Minimum operating voltage for the controller |
| `connector` | `string` | battery | Output connector type (`"qs8"`, `"xt90"`, `"supco"`) |
| `connectors` | `string[]` | controller | List of connector types the controller accepts |

Specs not listed above are stored in the database (e.g., `kv`, `max_kw`, `capacity_ah`, `wheel_size_max`) but are not yet read by the compatibility function.

### `CompatibilityIssue`

```ts
type CompatibilitySeverity = 'error' | 'warning' | 'info';

interface CompatibilityIssue {
  severity: CompatibilitySeverity;
  message: string;               // user-facing string, shown in the sidebar
  relatedCategories: PartCategory[];  // which parts are involved (unused in UI currently)
}
```

Severity levels map to color coding in the Sidebar:
- `error` → red (`bg-red-500/10, text-red-400, border-red-500/20`)
- `warning` → yellow (`bg-yellow-500/10, text-yellow-400, border-yellow-500/20`)
- `info` → blue (`bg-blue-500/10, text-blue-400, border-blue-500/20`)

---

## Existing Rules

### Rule 1: Frame/Motor Mount Compatibility (error)

```ts
if (frame && motor) {
  const frameMount = frame.specs?.mount_type as string;
  const motorMount = motor.specs?.mount_type as string;
  if (frameMount && motorMount && frameMount !== motorMount) {
    issues.push({ severity: 'error', message: `Motor mount type (${motorMount}) is not compatible with Frame mount type (${frameMount}).`, relatedCategories: ['frame', 'motor'] });
  }
}
```

**Condition:** Both parts selected AND both have `mount_type` in specs AND they differ.  
**Missing data behavior:** If either part lacks `mount_type`, the rule is silently skipped — no false positives.

Current `mount_type` values in MOCK_DB: `"sur-ron"`, `"talaria"`, `"ebox"`, `"eride"`, `"macfox"`, `"tuttio"`, `"yozma"`.

### Rule 2: Battery Overvoltage (error)

```ts
if (battery && controller) {
  const batteryVoltage = Number(battery.specs?.voltage);
  const controllerMaxVoltage = Number(controller.specs?.max_voltage);
  if (!isNaN(batteryVoltage) && !isNaN(controllerMaxVoltage) && batteryVoltage > controllerMaxVoltage) {
    issues.push({ severity: 'error', message: `Battery voltage (${batteryVoltage}v) exceeds Controller maximum voltage limit (${controllerMaxVoltage}v). Risk of severe damage.`, relatedCategories: ['battery', 'controller'] });
  }
}
```

**Risk modeled:** Overvoltage destroys the controller's FETs instantly.

### Rule 3: Battery Undervoltage (error)

Same block as Rule 2, checks `batteryVoltage < controllerMinVoltage`.

**Risk modeled:** Controller won't boot or will fault below minimum operating voltage.

### Rule 4: Connector Mismatch (warning)

```ts
if (battery && controller) {
  const batteryConnector = battery.specs?.connector as string;
  const controllerConnectors = controller.specs?.connectors as string[];
  if (batteryConnector && controllerConnectors && Array.isArray(controllerConnectors)) {
    if (!controllerConnectors.includes(batteryConnector)) {
      issues.push({ severity: 'warning', message: `Connector mismatch: Battery uses ${batteryConnector}, but Controller supports ${controllerConnectors.join(', ')}. An adapter may be required.`, relatedCategories: ['battery', 'controller'] });
    }
  }
}
```

**Risk modeled:** Mismatched connectors require an adapter (acceptable) or re-wiring (more work). Not a hard blocker, hence `warning` not `error`.

---

## Extension Points

### Adding a new rule

Add an `if` block to `evaluateCompatibility()` in `src/lib/compatibility.ts`. The function receives the entire `Record<PartCategory, Part | null>`. No other files need to change.

Pattern:
```ts
// Rule N: Description
if (partA && partB) {
  const aValue = partA.specs?.some_key as SomeType;
  const bValue = partB.specs?.other_key as SomeType;
  if (aValue && bValue && /* conflict condition */) {
    issues.push({
      severity: 'error' | 'warning' | 'info',
      message: `Human-readable explanation with values.`,
      relatedCategories: ['categoryA', 'categoryB'],
    });
  }
}
```

### Adding a new spec key

1. Add the key to `Part.specs` in `MOCK_DB` (Sidebar.tsx) for relevant parts
2. Add to `seed.sql` for the Supabase parts table (for future real data)
3. Read it in `evaluateCompatibility()`
4. The `Part.specs` type is `Record<string, string | number | boolean | string[]>` — any key is valid without a type change

### Changing severity

Severity is just a string in each `issues.push()` call. Change `'error'` to `'warning'` (or vice versa) directly. The Sidebar renders the appropriate color automatically.

---

## Future Rule Recommendations

These rules are not yet implemented. Data is not fully in place for all of them.

### High Priority

**Motor KW vs. Controller phase amps** (error or warning)
- `motor.specs.max_kw` exists in seed.sql but not in MOCK_DB
- `controller.specs.max_phase_amps` exists in seed.sql but not in MOCK_DB
- Rule: if motor draw at peak voltage exceeds controller's rated phase amps, flag it
- Formula: `peak_phase_amps ≈ (motor.max_kw × 1000) / (battery.voltage × 0.8)` (rough)

**Battery dimensions vs. frame clearance** (error)
- `frame.specs.clearance` exists in seed.sql (`"standard"`, `"wide"`)
- `battery.specs.dimensions` exists in seed.sql (`"sur-ron-std"`)
- Rule: if battery dimensions don't fit the frame's clearance rating, flag it

**Motor KV vs. battery voltage** (warning)
- KV (RPM/volt) × voltage = no-load RPM. High-KV motors on high-voltage packs can over-speed.
- `motor.specs.kv` and `battery.specs.voltage` are both available in seed.sql

### Medium Priority

**Wheel size compatibility**
- `frame.specs.wheel_size_max` exists in seed.sql
- No wheel parts in the catalog yet — implement when wheels category is built

**Controller thermal compatibility** (info)
- Some controllers (BAC4000) are known to throttle in hot climates
- This is more editorial than data-driven; could be an `info` banner on certain selections

**Battery connector amperage rating** (warning)
- XT90: rated 90A continuous
- QS8: rated 200A continuous
- If `motor.max_kw` at `battery.voltage` implies > 90A and battery uses XT90, warn

### Low Priority

**Frame + controller physical fit** (warning)
- Some frames have limited controller mounting space (e.g., Talaria Sting R has specific Ebox placement)
- This requires a new spec: `controller.specs.form_factor` and `frame.specs.controller_mount`

**Motor + battery discharge compatibility** (info)
- Battery C-rating × capacity_ah = max continuous amps
- If motor can draw more than battery can deliver, flag degraded performance

---

## Current Gaps

- `relatedCategories` is stored on each issue but the Sidebar does not use it to highlight specific category buttons. The field exists as a hook for future UI that visually marks incompatible categories in the category list.
- The `'info'` severity level is defined and styled, but no existing rule produces `info` issues. It's ready to use.
- The compatibility function only examines `frame`, `motor`, `battery`, and `controller`. The `seat`, `brakes`, `suspension`, and `wheels` categories are silently ignored even when parts are selected.
