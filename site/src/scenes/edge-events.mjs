import { eventEdges } from '../lib/scene/event-edges.mjs';
import { createEdgeExplorer } from '../lib/scene/defence-explorers.mjs';
const worked = eventEdges();
export const exploration = createEdgeExplorer(worked);
export default worked;
