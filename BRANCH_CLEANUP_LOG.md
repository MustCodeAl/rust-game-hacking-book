# Finished remote branch cleanup — 2026-10-08

Owner requested removal of finished remote branches. Refreshed origin and verified each exact deleted head is an ancestor of origin/gh-pages b192236d82e7d81512c1c6073510059a3d8329a9. Normal remote deletion succeeded for all12branches; their commits remain in that published history. No force push.

| Deleted branch | Preserved head commit |
| --- | --- |
| `codex/gh-pages-animated-lessons` | `885e7696afbd274a5aa0ee7d6375234b3a651121` |
| `codex/gh-pages-balanced-reader` | `580de56ba59161ef84e3ddf43658f0feb1a73b73` |
| `codex/gh-pages-book-revision` | `086da283891bf7f0bdfb764871ce05ebc8330fb9` |
| `codex/gh-pages-book-structure` | `18e8bbb5f4023172764fef5502373732378a55c9` |
| `codex/gh-pages-chapter-flow` | `66b18fa967aebab180f4612fc5cdc2218edd4b8d` |
| `codex/gh-pages-colour-contrast` | `f45a818efe42e5445035d3ebb2886289d64d0086` |
| `codex/gh-pages-firmware-fundamentals` | `01b7b683c2f62d4d71308c5d7de70a1523ac3fe3` |
| `codex/gh-pages-purposeful-colours` | `2051a6fd9e5b3d01828c98e6fb76d41f2f116ce8` |
| `codex/gh-pages-reader-appearance` | `f34b869d3adda209b19f9d37eaa8708b24d2ed11` |
| `codex/gh-pages-reader-diagrams-print` | `34813423b632ea9d28061d6493b4cec96361237c` |
| `codex/gh-pages-theme-harmony` | `06fab81f4c43ce22f9d00d402c1fa79c06ce4774` |
| `codex/gh-pages-theme-reading-roles` | `76f5b65966ba3f590d6fd87c3524e65d8d5a6754` |

Kept the active source/Pages/Claude worktree branches, historical master/main/archive branches and codex/revert-wrong-source-merge (not merged). Future finished feature branches should be removed after verified integration and publication; do not delete active or unique unfinished work.
