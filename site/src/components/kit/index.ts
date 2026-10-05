// Every component for lessons, from one import:
//
//   import { Steps, Tabs, Tab, Accordion } from '../../../../components/kit';
//
// Starlight's own Steps, FileTree, Card, CardGrid, Badge, and Icon are
// re-exported beside the book's, and LinkCard and LinkButton add the site's base
// path to links that start with /. The /components/ page
// (src/content/docs/components.mdx) shows each one in use; README.md in this
// folder says when to reach for it.
export { Badge, Card, CardGrid, FileTree, Icon, Steps } from '@astrojs/starlight/components';
export { default as Accordion } from './Accordion.astro';
export { default as AccordionGroup } from './AccordionGroup.astro';
export { default as CodeGroup } from './CodeGroup.astro';
export { default as Color } from './Color.astro';
export { default as Column } from './Column.astro';
export { default as Columns } from './Columns.astro';
export { default as Example } from './Example.astro';
export { default as Expandable } from './Expandable.astro';
export { default as Fields } from './Fields.astro';
export { default as Frame } from './Frame.astro';
export { default as GitHub } from './GitHub.astro';
export { default as HoverCard } from './HoverCard.astro';
export { default as LinkButton } from './LinkButton.astro';
export { default as LinkCard } from './LinkCard.astro';
export { default as Math } from './Math.astro';
export { default as MarginNote } from './MarginNote.astro';
export { default as MotionPicture } from './MotionPicture.astro';
export { default as Panel } from './Panel.astro';
export { default as ParamField } from './ParamField.astro';
export { default as Prompt } from './Prompt.astro';
export { default as ResponseField } from './ResponseField.astro';
export { default as SpeedType } from './SpeedType.astro';
export { default as Tab } from './Tab.astro';
export { default as Tabs } from './Tabs.astro';
export { default as Tile } from './Tile.astro';
export { default as Tiles } from './Tiles.astro';
export { default as Tooltip } from './Tooltip.astro';
export { default as Update } from './Update.astro';
export { default as Updates } from './Updates.astro';
