import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
import { eventEdges } from '../lib/scene/event-edges.ts';
import { createEdgeExplorer } from '../lib/scene/defence-explorers.ts';
const worked = eventEdges();
export const exploration = createEdgeExplorer(worked);
export default worked;
