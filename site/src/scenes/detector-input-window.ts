import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
import { inputWindow } from '../lib/scene/defence.ts';
import { createInputWindowExplorer } from '../lib/scene/defence-explorers.ts';
const worked = inputWindow();
export const exploration = createInputWindowExplorer(worked);
export default worked;
