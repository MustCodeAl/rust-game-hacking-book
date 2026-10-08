import { correlation } from '../lib/scene/defence.mjs';
import { createCorrelationExplorer } from '../lib/scene/defence-explorers.mjs';
const worked = correlation();
export const exploration = createCorrelationExplorer(worked);
export default worked;
