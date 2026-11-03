# my-skills

A collection of skills I create, maintain, and share for use across a broad range of tasks and domains. The collection is open-ended and is not tied to a particular device, platform, or AI agent.

Each skill packages reusable instructions and, where useful, supporting references and scripts. Individual skills may require particular tools, services, or runtimes; those requirements belong in the skill's own documentation.

## Skills

- `danbooru-tags` - convert image briefs and tag queries into validated Danbooru tags.
- `image-prompt-helper` - optimize prompts for image generation and editing.
- `invoice-verification` - verify invoice ledgers on China's official VAT invoice verification platform and generate reports with screenshots.
- `jellyfin-media-organizer` - plan and safely normalize Jellyfin media libraries.
- `media-metadata-apis` - query TMDB, TVDB, and AniDB metadata from local credentials.

## Layout

```text
skills/
  <skill-name>/
    SKILL.md
    agents/             # optional agent-specific metadata
    references/
    scripts/
```

Only `SKILL.md` is required. Other folders are included when the skill needs them.

## Use a skill

1. Choose a skill from the list and read its `SKILL.md` for its workflow and requirements.
2. If your agent supports loading skills, follow its instructions to copy, link, or import the skill directory. Keep any references and scripts alongside `SKILL.md`.
3. Otherwise, use the documented workflow as a guide and adapt it to the tools available in your environment.

Installation paths, metadata support, and reload behavior depend on the consuming tool. For example, `agents/openai.yaml` provides metadata for compatible OpenAI tools and is optional for other consumers.

## Maintain and share

Keep each skill's workflow in `SKILL.md`, with detailed guidance in `references/` and reusable helpers in `scripts/`. Document dependencies and environment-specific steps within the affected skill so others can assess and adapt it. Update the skill list when adding or removing a skill.
