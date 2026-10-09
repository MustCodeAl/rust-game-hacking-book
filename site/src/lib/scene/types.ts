export type Role = 'input' | 'state' | 'process' | 'output' | 'caution' | 'muted' | 'plain';
export type Easing = 'linear' | 'in' | 'out' | 'inOut';
export type Format = 'dec' | 'hex2' | 'hex4' | 'hex8' | 'x2' | 'x4' | 'x8' | 'bin8' | 'f1' | 'f2' | 'ms';
export type Point = [number, number];
export type Label = string | number | string[];
export type TrackValue = Label;
export type Cue = [time: number, words: string];
export type TrackProperty = 'x' | 'y' | 'o' | 's' | 'a' | 'w' | 'h' | 'draw' | 'num' | 'u' | 'text' | 'role';
export type Keyframe<T = TrackValue> = [time: number, value: T, easing?: Easing];
export type Track = Keyframe[];
export type TrackMap = Partial<Record<TrackProperty, Track>>;
export type Tracks = Record<string, TrackMap>;
export interface ActorOptions {
  role?: Role; look?: 'plain' | 'ghost'; r?: number; cls?: string;
  o?: number; s?: number; a?: number; draw?: number; num?: number; fmt?: Format;
  mono?: boolean; size?: number; weight?: number | string; anchor?: 'start' | 'middle' | 'end'; lead?: number;
  follow?: Point[]; width?: number; dash?: boolean; arrow?: boolean; fill?: boolean;
  w?: number; h?: number; t?: Label; kids?: Actor[];
}
export interface ActorBase extends ActorOptions { id: string; x: number; y: number }
export type RectActor = ActorBase & { k: 'rect'; w: number; h: number };
export type CellActor = ActorBase & { k: 'cell'; w: number; h: number; t: Label };
export type TextActor = ActorBase & { k: 'text'; t: Label };
export type LineActor = ActorBase & { k: 'line'; x2: number; y2: number };
export type PathActor = ActorBase & { k: 'path'; d: string; len?: number };
export type CircleActor = ActorBase & { k: 'circle'; r: number };
export type PolygonActor = ActorBase & { k: 'poly'; pts: Point[] };
export type ImageActor = ActorBase & { k: 'image'; w: number; h: number; src: string };
export type GroupActor = ActorBase & { k: 'g'; kids: Actor[] };
export type Actor = RectActor | CellActor | TextActor | LineActor | PathActor | CircleActor | PolygonActor | ImageActor | GroupActor;
export interface Transform { x?: number; y?: number; s?: number; a?: number }
export interface AnimatedValues extends Transform {
  o?: number; w?: number; h?: number; draw?: number; num?: number; u?: number; text?: Label; role?: Role;
}
export type SceneState = Record<string, AnimatedValues>;
export interface AnimatedActor { id: string; tracks: TrackMap; fmt?: Format; pts?: Point[]; base: Required<Transform> }
export interface SceneDefinition {
  id: string; title: string; alt: string; caption?: string; w: number; h: number;
  actors: Actor[]; cues?: Cue[]; tracks?: Tracks; end?: number;
}
export interface Scene extends SceneDefinition { cues: Cue[]; duration: number; animated: AnimatedActor[] }
export interface PlayerSpec { d: number; c: number[]; a: AnimatedActor[] }
export interface TimelineCursor {
  at(time: number): TimelineCursor; wait(dt: number): TimelineCursor; readonly t: number;
  move(id: string, x: number | null, y: number | null, dur?: number, ease?: Easing): TimelineCursor;
  fade(id: string, to: number, dur?: number): TimelineCursor; show(id: string, dur?: number): TimelineCursor; hide(id: string, dur?: number): TimelineCursor;
  role(id: string, role: Role): TimelineCursor; text(id: string, words: Label): TimelineCursor;
  num(id: string, value: number, dur?: number): TimelineCursor; draw(id: string, to?: number, dur?: number, ease?: Easing): TimelineCursor;
  scale(id: string, to: number, dur?: number): TimelineCursor; rotate(id: string, to: number, dur?: number): TimelineCursor;
  resize(id: string, w: number | null, h: number | null, dur?: number): TimelineCursor;
  follow(id: string, u: number, dur?: number): TimelineCursor; pulse(id: string, size?: number, dur?: number): TimelineCursor;
}
export interface Timeline { at(time: number): TimelineCursor; cue(time: number, words: string): void; cues: Cue[]; readonly tracks: Tracks }
export type ExplorerValues = Record<string, unknown>;
export type ExplorerSettings = Record<string, number | boolean>;
export type ExplorerField =
  | { key: string; label: string; type: 'checkbox'; start: boolean }
  | { key: string; label: string; type: 'range'; min: number; max: number; step: number; start: number; unit?: string };
export interface Explorer<Model = unknown> {
  fields: ExplorerField[]; defaults: ExplorerSettings; invite: string;
  build(values?: ExplorerValues): { model: Model; scene: Scene; summary: string };
}

export interface SceneModule { default: Scene; exploration?: Explorer }
