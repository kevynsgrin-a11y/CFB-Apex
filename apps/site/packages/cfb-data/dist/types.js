/**
 * Shapes of the CFB Apex 2026 dataset.
 *
 * Every one of these mirrors an artifact under `data/dist`, which is generated
 * from the research package by `tools/etl`. Two conventions run through all of
 * them and matter more than any individual field:
 *
 *   1. `null` means the source did not publish a value. It never means zero,
 *      empty, or "we could not be bothered". Render it as "Not listed", not "0".
 *   2. Every artifact carries a `meta` block naming the source documents it was
 *      built from, so any number on the site can be traced to a document.
 */
export {};
//# sourceMappingURL=types.js.map