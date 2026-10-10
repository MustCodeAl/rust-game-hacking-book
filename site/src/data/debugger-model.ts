export type RecordedValue = string | number;
export interface RecordedStackSlot {
  label: string;
  value: string;
  kind: 'return' | 'saved' | 'unallocated';
}
export interface DebuggerStep {
  /** One-based source line associated with this recorded snapshot. */
  line: number;
  description: string;
  registers: Record<string, RecordedValue>;
  variables?: Record<string, RecordedValue>;
  stack?: RecordedStackSlot[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function values(value: unknown): value is Record<string, RecordedValue> {
  return record(value) && Object.entries(value).every(([name, item]: [string, unknown]) => name.trim().length > 0 && (typeof item === 'string' || (typeof item === 'number' && Number.isFinite(item))));
}
function stackSlot(value: unknown): value is RecordedStackSlot {
  return record(value) && typeof value.label === 'string' && typeof value.value === 'string' && (value.kind === 'return' || value.kind === 'saved' || value.kind === 'unallocated');
}
function distinctNames(registers: Record<string, RecordedValue>, variables: unknown): boolean {
  return variables === undefined || (record(variables) && Object.keys(variables).every((name) => !Object.hasOwn(registers, name)));
}
export function validDebuggerSteps(value: unknown, lineCount: number): value is DebuggerStep[] {
  return Number.isInteger(lineCount) && lineCount > 0 && Array.isArray(value) && value.length > 0 && value.every((step: unknown) => record(step)
    && typeof step.line === 'number' && Number.isInteger(step.line) && step.line >= 1 && step.line <= lineCount
    && typeof step.description === 'string' && values(step.registers)
    && (step.variables === undefined || values(step.variables))
    && distinctNames(step.registers, step.variables)
    && (step.stack === undefined || (Array.isArray(step.stack) && step.stack.every(stackSlot))));
}
