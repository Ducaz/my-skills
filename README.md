# my-skills

Personal Codex skills maintained in this repository.

## Skills

- `danbooru-tags` - convert image briefs and tag queries into validated Danbooru tags.
- `image-prompt-helper` - optimize prompts for image generation and editing.
- `jellyfin-media-organizer` - plan and safely normalize Jellyfin media libraries.
- `media-metadata-apis` - query TMDB, TVDB, and AniDB metadata from local credentials.

## Layout

```text
skills/
  <skill-name>/
    SKILL.md
    agents/openai.yaml
    references/
    scripts/
```

Only `SKILL.md` is required. Other folders are included when the skill needs them.

## Local install

Link each maintained skill into the Codex skills directory:

```powershell
New-Item -ItemType Junction -Path "$HOME\.codex\skills\<skill-name>" -Target "$PWD\skills\<skill-name>"
```

Restart Codex after adding or changing skill links.
