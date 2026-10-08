import { inputWindow } from '../lib/scene/defence.mjs';
import { createInputWindowExplorer } from '../lib/scene/defence-explorers.mjs';
const worked = inputWindow();
export const exploration = createInputWindowExplorer(worked);
export default worked;
