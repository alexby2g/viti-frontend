# Draft sync recovery checkpoint

This branch is isolated from Primer Access and Moldeador.

Checkpoint: 9bf574b39ed0c2ecbe0786e51f9b193070c22565.

Recovered backend capabilities already present in the current platform:
- draft_revision
- base_revision / optimistic conflict checks
- HTTP 409 on stale draft revision
- public draft persistence endpoint

Frontend recovery started with a shared draft-sync helper. The next step is to wire restore/conflict UI into the current IdeaBuilder without replacing its existing UX.
