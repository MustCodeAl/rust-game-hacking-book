import { authority } from '../lib/scene/defence.mjs';
import { createAuthorityExplorer } from '../lib/scene/defence-explorers.mjs';
const worked = authority();
export const exploration = createAuthorityExplorer(worked);
export default worked;
