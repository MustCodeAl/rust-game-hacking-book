// Message-flow scenarios: lanes (who talks) and ordered steps (who says what to whom).
// Pure data and checks, shared by the Astro renderer, the browser player and the offline check.

export type FlowKind = 'request' | 'response' | 'data' | 'control' | 'secure' | 'local';

export interface FlowLane {
  readonly id: string;
  readonly label: string;
}

export interface FlowStep {
  /** Lane that speaks. */
  readonly from: string;
  /** Lane that receives; equal to `from` for work one party does alone. */
  readonly to: string;
  /** Short text drawn on the arrow. */
  readonly label: string;
  /** One or two sentences shown as the current explanation. */
  readonly caption: string;
  readonly kind?: FlowKind;
}

export interface FlowScenario {
  readonly id: string;
  readonly tab: string;
  readonly title: string;
  readonly summary: string;
  readonly lanes: readonly FlowLane[];
  readonly steps: readonly FlowStep[];
}

export interface FlowSpan {
  /** 1-based grid columns, start <= end. */
  readonly start: number;
  readonly end: number;
  readonly direction: 'right' | 'left' | 'self';
}

export function laneIndex(scenario: FlowScenario, id: string): number {
  return scenario.lanes.findIndex(lane => lane.id === id);
}

export function stepSpan(scenario: FlowScenario, step: FlowStep): FlowSpan {
  const from = laneIndex(scenario, step.from) + 1;
  const to = laneIndex(scenario, step.to) + 1;
  if (from === to) return { start: from, end: to, direction: 'self' };
  return { start: Math.min(from, to), end: Math.max(from, to), direction: to > from ? 'right' : 'left' };
}

/** Human-readable route used by screen readers and by the narrow-screen layout. */
export function stepRoute(scenario: FlowScenario, step: FlowStep): string {
  const from = scenario.lanes.find(lane => lane.id === step.from)?.label ?? step.from;
  const to = scenario.lanes.find(lane => lane.id === step.to)?.label ?? step.to;
  return from === to ? `${from} (alone)` : `${from} to ${to}`;
}

/** Returns every problem found; an empty list means the scenario is well formed. */
export function scenarioProblems(scenario: FlowScenario): string[] {
  const problems: string[] = [];
  const ids = scenario.lanes.map(lane => lane.id);
  if (new Set(ids).size !== ids.length) problems.push(`${scenario.id}: duplicate lane ids`);
  if (scenario.lanes.length < 2 || scenario.lanes.length > 5) problems.push(`${scenario.id}: needs two to five lanes`);
  if (scenario.steps.length < 2) problems.push(`${scenario.id}: needs at least two steps`);
  scenario.steps.forEach((step, index) => {
    const where = `${scenario.id} step ${index + 1}`;
    if (!ids.includes(step.from) || !ids.includes(step.to)) problems.push(`${where}: unknown lane`);
    if (!step.label.trim() || !step.caption.trim()) problems.push(`${where}: empty text`);
    if (step.label.length > 44) problems.push(`${where}: label longer than 44 characters`);
  });
  return problems;
}
