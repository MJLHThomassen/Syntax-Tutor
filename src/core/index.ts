// Editor-independent entry point for the tests. Each language spec is bundled
// separately (dist/test/lang-<file>.js) so specs can be worked on independently.
export * from './analyzer';
export * from './embedded';
export * from './grouping';
export * from './parser';
export * from './lines';
export * from './outline';
export * from './hoverDocs';
export * from './incremental';
