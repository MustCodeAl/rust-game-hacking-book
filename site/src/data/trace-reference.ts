export interface TraceReferenceStep {
  line: number;
  description: string;
  values: Array<[string, string]>;
  memory: Array<{ label: string; value: string; note: string }>;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Read the existing trace contract without coupling its engine to the reader UI. */
export function defaultTraceReference(model: unknown): TraceReferenceStep[] {
  if (!record(model) || typeof model.run !== 'function') throw new Error('Trace reference needs a trace runner.');
  const inputs: Record<string, string | number> = {};
  if (Array.isArray(model.inputs)) {
    for (const input of model.inputs) {
      if (!record(input) || typeof input.id !== 'string' || (typeof input.value !== 'string' && typeof input.value !== 'number')) throw new Error('Trace reference has an invalid default input.');
      inputs[input.id] = input.value;
    }
  }
  const steps: unknown = model.run(inputs);
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('Trace reference needs recorded steps.');
  let memory: TraceReferenceStep['memory'] = [];
  return steps.map((step: unknown) => {
    if (!record(step) || typeof step.line !== 'number' || !Number.isInteger(step.line) || step.line < 0 || typeof step.say !== 'string' || !record(step.vars)) throw new Error('Trace reference has an invalid step.');
    if (record(step.mem) && Array.isArray(step.mem.cells)) {
      memory = step.mem.cells.map((cell: unknown) => {
        if (!record(cell) || typeof cell.label !== 'string') throw new Error('Trace reference has an invalid memory cell.');
        return { label: cell.label, value: String(cell.value), note: typeof cell.note === 'string' ? cell.note : '' };
      });
    }
    return { line: step.line + 1, description: step.say, values: Object.entries(step.vars).map(([name, value]) => [name, String(value)]), memory };
  });
}
