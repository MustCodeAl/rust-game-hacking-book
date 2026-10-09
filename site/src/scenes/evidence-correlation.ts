import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
import { correlation } from '../lib/scene/defence.ts';
import { createCorrelationExplorer } from '../lib/scene/defence-explorers.ts';
const worked = correlation();
export const exploration = createCorrelationExplorer(worked);
export default worked;
