# Repository Guidelines

## Project Structure & Module Organization

This repository maintains reusable Codex skills under `skills/`. Each skill lives in a kebab-case directory such as `skills/media-metadata-apis/` and must include a `SKILL.md` file with YAML front matter (`name` and `description`) followed by its operating instructions. Optional supporting material belongs in:

- `agents/openai.yaml` for the display name, description, and default prompt.
- `references/` for detailed guidance that should not crowd `SKILL.md`.
- `scripts/` for reusable Python or PowerShell helpers.

Update the root `README.md` skill list when adding or removing a skill.

## Build, Test, and Development Commands

There is no build step. Run helpers from the repository root:

```powershell
python skills\media-metadata-apis\scripts\metadata_lookup.py --help
python skills\danbooru-tags\scripts\validate_tags.py --input tags.txt
pwsh -File skills\media-metadata-apis\scripts\test_metadata_apis.ps1 -EnvPath .env
```

The first two commands exercise CLI parsing and tag validation. The PowerShell smoke test makes live provider requests and requires local credentials. Use its `-SkipTmdb`, `-SkipAnidb`, or `-SkipTvdb` switches when appropriate.

## Coding Style & Naming Conventions

Use four-space indentation, descriptive snake_case Python identifiers, and approved PowerShell `Verb-Noun` function names. Keep scripts dependency-light; current Python helpers use the standard library. Follow `.gitattributes`: LF for `.py`, CRLF for `.ps1`. Write short, imperative Markdown rules. Keep `SKILL.md`, relevant references, and `agents/openai.yaml` consistent.

## Testing Guidelines

No formal test framework or coverage threshold is configured. Before submitting, run the affected script's `--help`, execute a representative success case, and check an invalid-input path. For API-dependent changes, run the provider smoke tests you can authenticate. Never commit generated reports, cache files, or credentials.

## Commit & Pull Request Guidelines

Recent history uses concise, lowercase, imperative subjects such as `add parameters` and `fix image-prompt-helper reference-only cases`. Keep each commit focused. Pull requests should name the affected skill, summarize user-visible changes, list validation results, and link relevant issues. Include before/after examples when output behavior changes.

## Security & Configuration

Store API credentials only in ignored `.env` files. Do not print tokens in examples, test output, fixtures, or review notes. Preserve existing masking and local credential loading.

If a source file or script has an abnormal header or appears encrypted, stop immediately: do not continue reading, editing, or committing it. Back up the encrypted copy. Restore the tracked original from Git only if no legitimate local work would be overwritten; otherwise ask the user to decrypt the file or approve restoration.
