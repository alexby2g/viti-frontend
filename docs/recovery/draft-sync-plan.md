# VITI Draft Sync Recovery

Recovery checkpoint: 9bf574b39ed0c2ecbe0786e51f9b193070c22565.

This block intentionally excludes Primer Acceso and Moldeador. The target is the public request editor only.

Acceptance criteria:
- preserve the current IdeaBuilder UX;
- persist responses locally per request token;
- keep current server draft revision as the base revision;
- send base_revision on draft saves;
- distinguish offline, pending, synchronized and conflict states;
- never claim a request was submitted while offline;
- surface a deterministic conflict action instead of silently overwriting server data;
- keep the work isolated in this recovery branch before merging into command-center.
