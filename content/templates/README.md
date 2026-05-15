# Content Templates

Templates here are owner-facing starting points for original question packs. They are not bundled
starter questions and are not scanned by `npm run validate:content` unless copied into
`content/questions/`.

Use `original-question-pack-template.json` as a draft import shell:

1. Copy it to a new file for the pack.
2. Replace all `OWNER_TODO` text and all `example.com` media URLs with original content.
3. Remove optional image or video blocks that are not ready.
4. Validate the completed pack by placing it under `content/questions/` and running
   `npm run validate:content`.
5. Import it in the app through `Manage Content` > `Import`.

Keep imported packs as `draft` until the owner previews the questions, checks alt text and rubrics,
and clears readiness blockers.
