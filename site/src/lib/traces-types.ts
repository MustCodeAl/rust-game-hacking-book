/**
 * Shapes shared by the step-through code tracer (`scripts/code-trace.ts`) and by every trace data module.
 * Types only: nothing here exists at run time.
 */

/** A value a step can show in the variables table. The engine prints it with `String(...)`. */
export type VarValue = string | number | boolean;

/** Every variable's value after one step. */
export type TraceVars = Readonly<Record<string, VarValue>>;

/** What a slider or select currently holds, keyed by input id. */
export type TraceValues = Readonly<Record<string, string | number>>;

/** One box in the optional memory strip. */
export interface TraceCell {
  readonly label: string;
  readonly value: string;
  readonly note?: string | undefined;
}

/** A row of boxes (bytes, array slots) shown under the variables. */
export interface TraceMemory {
  readonly title: string;
  readonly cells: readonly TraceCell[];
}

/** One highlighted line plus the state after it ran. A step without `mem` keeps the previous strip. */
export interface TraceStep {
  line: number;
  say: string;
  vars: TraceVars;
  mem?: TraceMemory | undefined;
}

/** A slider. `Id` is the literal id so a trace's `run` can destructure it by name. */
export interface RangeInput<Id extends string = string> {
  readonly id: Id;
  readonly label: string;
  readonly type: 'range';
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly show?: ((value: number) => string) | undefined;
}

export interface SelectOption<Value extends string = string> {
  readonly value: Value;
  readonly label: string;
}

/** A drop-down. `Choice` is the union of the option values. */
export interface SelectInput<Id extends string = string, Choice extends string = string> {
  readonly id: Id;
  readonly label: string;
  readonly type: 'select';
  readonly value: Choice;
  readonly options: readonly SelectOption<Choice>[];
}

export type TraceInput = RangeInput | SelectInput;

/** What one input hands to `run`: a number for a slider, the chosen option for a select. */
export type InputValue<Input extends TraceInput> = Input extends RangeInput
  ? number
  : Input extends SelectInput<string, infer Choice extends string>
    ? Choice
    : never;

/** The values object `run` receives, with one property per input id. */
export type InputValues<Inputs extends readonly TraceInput[]> = {
  readonly [Input in Inputs[number] as Input['id']]: InputValue<Input>;
};

/** A trace as the engine sees it. `run` and `code` accept any values the inputs can produce. */
export interface Trace {
  readonly title: string;
  readonly intro: string;
  readonly code: readonly string[] | ((values: TraceValues) => readonly string[]);
  readonly inputs?: readonly TraceInput[] | undefined;
  readonly run: (values: TraceValues) => TraceStep[];
}

/** A trace whose listing is fixed and whose inputs are all declared (the scene, handoff and original models). */
export interface ListedTrace extends Trace {
  readonly code: readonly string[];
  readonly inputs: readonly TraceInput[];
}

/** What an author writes: `run` and `code` see values typed by the declared inputs. */
export interface TraceDefinition<Inputs extends readonly TraceInput[]> {
  readonly title: string;
  readonly intro: string;
  readonly code: readonly string[] | ((values: InputValues<Inputs>) => readonly string[]);
  readonly inputs?: Inputs;
  readonly run: (values: InputValues<Inputs>) => TraceStep[];
}

/** The same for a trace with a fixed listing and declared inputs. */
export interface ListedTraceDefinition<Inputs extends readonly TraceInput[]> extends TraceDefinition<Inputs> {
  readonly code: readonly string[];
  readonly inputs: Inputs;
}
