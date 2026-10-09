import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
import { authority } from '../lib/scene/defence.ts';
import { createAuthorityExplorer } from '../lib/scene/defence-explorers.ts';
const worked = authority();
export const exploration = createAuthorityExplorer(worked);
export default worked;
