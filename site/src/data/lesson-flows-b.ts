// More message-flow scenarios (FlowDiagram) that replace generated pictures. Lanes get colours and icons automatically.
import type { FlowScenario } from '../lib/flow-model';

/** Lesson 6.9 (pages/6/09.mdx): selected door properties travel through SendTable and RecvTable. */
export const doorNetworkFlows: readonly FlowScenario[] = [{
  id: 'door-properties', tab: 'Door properties',
  title: 'Only the selected door properties cross the network',
  summary: 'The server door holds position, opening state and scheduling. Position and opening state are sent; scheduling stays on the server.',
  lanes: [{ id: 'server', label: 'Server door' }, { id: 'send', label: 'SendTable', icon: 'file' }, { id: 'recv', label: 'RecvTable', icon: 'file' }, { id: 'client', label: 'Client door', icon: 'computer' }],
  steps: [
    { from: 'server', to: 'server', kind: 'local', label: 'Door holds position, open state, scheduling', caption: 'The server’s door object has more state than any client needs.' },
    { from: 'server', to: 'send', kind: 'data', label: 'Position and opening state', caption: 'The SendTable names which fields become network properties. These two are on the list.' },
    { from: 'server', to: 'server', kind: 'local', label: 'Scheduling stays here', caption: 'Fields that are not on the list never leave the server.' },
    { from: 'send', to: 'recv', kind: 'data', label: 'Network properties', caption: 'The chosen values are sent to the client in a compact form.' },
    { from: 'recv', to: 'client', kind: 'data', label: 'Update the client’s door', caption: 'The RecvTable describes how those values land in the client’s copy of the door.' },
    { from: 'client', to: 'client', kind: 'local', label: 'Draw the door', caption: 'The client draws what it was told, with no knowledge of the server’s scheduling.' },
  ],
}];

const modLanes = [{ id: 'installer', label: 'Mod installer', icon: 'computer' as const }, { id: 'folder', label: 'Game folder', icon: 'disk' as const }, { id: 'backup', label: 'Backup', icon: 'disk' as const }] as const;

/** Lesson 9.6 (pages/9/06.mdx): undoing an install depends on whether it created or replaced a file. */
export const modUndoFlows: readonly FlowScenario[] = [
  {
    id: 'create', tab: 'Add a new file',
    title: 'Undoing a created file',
    summary: 'A new file is undone by removing it. The expected hash is checked before the installer touches anything.',
    lanes: modLanes,
    steps: [
      { from: 'installer', to: 'folder', kind: 'data', label: 'Write the new file', caption: 'Nothing existed at this path, so there is nothing to back up.' },
      { from: 'installer', to: 'folder', kind: 'request', label: 'Undo: check the installed file’s hash', caption: 'Before removing anything, confirm the file is still the one this installer wrote.' },
      { from: 'installer', to: 'folder', kind: 'control', label: 'Remove the installed file', caption: 'The game folder is back to how it started.' },
    ],
  },
  {
    id: 'replace', tab: 'Replace an original',
    title: 'Undoing a replaced file',
    summary: 'A replaced file needs its backup. The expected hashes are checked before either file is changed.',
    lanes: modLanes,
    steps: [
      { from: 'installer', to: 'folder', kind: 'request', label: 'Check the original’s hash', caption: 'Confirm the file to replace is the expected original before touching it.' },
      { from: 'folder', to: 'backup', kind: 'data', label: 'Save the original', caption: 'The original is copied to the backup first, so it can come back.' },
      { from: 'installer', to: 'folder', kind: 'data', label: 'Write the replacement', caption: 'Only now is the original’s path overwritten.' },
      { from: 'installer', to: 'folder', kind: 'request', label: 'Undo: check the replacement’s hash', caption: 'Confirm the file is still the replacement this installer wrote.' },
      { from: 'backup', to: 'folder', kind: 'data', label: 'Restore the backup', caption: 'The saved original goes back to its path, and the folder is as it was.' },
    ],
  },
];

/** Lesson 10.7 (pages/10/07.mdx): one user-mode process, several software layers, then the kernel. */
export const callLayerFlows: readonly FlowScenario[] = [{
  id: 'call-layers', tab: 'A call down to the kernel',
  title: 'A call passes through layers in one process before the kernel',
  summary: 'The application, the Win32 DLL and the ntdll stub all run in the same user-mode process. Only a controlled gate reaches the kernel.',
  lanes: [{ id: 'app', label: 'Application', icon: 'computer' }, { id: 'win32', label: 'Win32 DLL', icon: 'plug' }, { id: 'ntdll', label: 'ntdll stub', icon: 'plug' }, { id: 'kernel', label: 'Kernel', icon: 'layers' }],
  steps: [
    { from: 'app', to: 'win32', kind: 'request', label: 'Call a Win32 function', caption: 'The application calls an ordinary documented function.' },
    { from: 'win32', to: 'ntdll', kind: 'request', label: 'Call the native stub', caption: 'The DLL’s implementation calls a lower-level stub in ntdll. Still the same process, still user mode.' },
    { from: 'ntdll', to: 'kernel', kind: 'secure', label: 'Controlled system-call gate', caption: 'The stub crosses into the kernel through a gate the CPU controls. This is the only privilege change.' },
    { from: 'kernel', to: 'kernel', kind: 'local', label: 'Validate the request', caption: 'The kernel checks the arguments and the caller’s rights before acting.' },
    { from: 'kernel', to: 'ntdll', kind: 'response', label: 'Result', caption: 'The kernel returns a result or an error code.' },
    { from: 'ntdll', to: 'win32', kind: 'response', label: 'Return', caption: 'The stub hands the result back up.' },
    { from: 'win32', to: 'app', kind: 'response', label: 'Return to the caller', caption: 'The Win32 function turns it into the value the application expects.' },
  ],
}];

const visibilityLanes = [{ id: 'server', label: 'Server', icon: 'server' as const }, { id: 'client', label: 'This client', icon: 'computer' as const }] as const;

/** Lesson 15.2 (pages/15/02.mdx): the server discloses an enemy position only when the sightline is clear. */
export const visibilityFlows: readonly FlowScenario[] = [
  {
    id: 'blocked', tab: 'Wall blocks the view',
    title: 'The server withholds what the observer cannot see',
    summary: 'In the toy wall example the server knows the enemy position, but a wall blocks the sightline, so it sends nothing about the enemy.',
    lanes: visibilityLanes,
    steps: [
      { from: 'server', to: 'server', kind: 'local', label: 'Enemy position is known here', caption: 'The server simulates the whole world, including the enemy.' },
      { from: 'server', to: 'server', kind: 'local', label: 'Sightline crosses the wall', caption: 'The observer’s line of sight to the enemy is blocked.' },
      { from: 'server', to: 'client', kind: 'control', label: 'Send nothing about the enemy', caption: 'A hack on this client cannot reveal what the client was never given.' },
    ],
  },
  {
    id: 'clear', tab: 'Sightline clears',
    title: 'The position is disclosed once the view is clear',
    summary: 'When the enemy moves above the wall and the sightline clears, the position becomes part of this client’s observation.',
    lanes: visibilityLanes,
    steps: [
      { from: 'server', to: 'server', kind: 'local', label: 'Enemy moves above the wall', caption: 'The world changes on the server.' },
      { from: 'server', to: 'server', kind: 'local', label: 'Sightline is clear', caption: 'Nothing blocks the observer’s view of the enemy now.' },
      { from: 'server', to: 'client', kind: 'data', label: 'Enemy position enters the observation', caption: 'Only now does the server send the position to this client.' },
    ],
  },
];
