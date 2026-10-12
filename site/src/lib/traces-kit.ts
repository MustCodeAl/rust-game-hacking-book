/**
 * Builders shared by the trace data modules. Pure functions: no browser API, so Node tools can load them.
 * `range` and `select` keep the input id and the option values as literal types, and `createTrace`
 * turns those declared inputs into the type of the `values` object that `run` and `code` receive.
 */
import type { InputValues, RangeInput, SelectInput, Trace, TraceDefinition, TraceInput, TraceValues } from './traces-types.ts';

/** A slider input. `step` defaults to 1. */
export function range<const Id extends string>(id: Id, label: string, min: number, max: number, value: number, step = 1): RangeInput<Id> {
  return { id, label, type: 'range', min, max, step, value };
}

/** A select input built from `[value, label]` pairs; the default `value` must be one of the pairs. */
export function select<const Id extends string, const Choice extends string>(
  id: Id,
  label: string,
  value: NoInfer<Choice>,
  entries: readonly (readonly [Choice, string])[],
): SelectInput<Id, Choice> {
  return { id, label, type: 'select', value, options: entries.map(([choice, text]) => ({ value: choice, label: text })) };
}

/** True when `values` holds, for every input, a number (slider) or one of the options (select). */
export function hasInputValues<Inputs extends readonly TraceInput[]>(inputs: Inputs | undefined, values: unknown): values is InputValues<Inputs> {
  if (typeof values !== 'object' || values === null) return false;
  return (inputs ?? []).every((input) => {
    const given: unknown = Reflect.get(values, input.id);
    return input.type === 'select' ? input.options.some((option) => option.value === given) : typeof given === 'number';
  });
}

/**
 * Turns a trace written against its own inputs into the engine's `Trace`. The engine builds `values`
 * from the inputs, so the check never fails there; it makes the typed destructuring in `run` honest.
 */
export function createTrace<const Inputs extends readonly TraceInput[] = readonly []>(definition: TraceDefinition<Inputs>): Trace {
  const typed = (values: TraceValues): InputValues<Inputs> => {
    if (!hasInputValues<Inputs>(definition.inputs, values)) throw new TypeError(`The values do not match the inputs of "${definition.title}"`);
    return values;
  };
  const { code, inputs } = definition;
  return {
    title: definition.title,
    intro: definition.intro,
    code: typeof code === 'function' ? (values) => code(typed(values)) : code,
    ...(inputs ? { inputs } : {}),
    run: (values) => definition.run(typed(values)),
  };
}
