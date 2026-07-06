---
name: media-metadata-apis
description: Query and cross-check movie, TV series, and anime metadata through TMDB, AniDB HTTP API, and TVDB v4. Use when Codex needs to look up titles, IDs, seasons, episodes, posters, external IDs, aliases, anime AniDB aid data, TVDB series/movie data, or build Jellyfin-style metadata matching and naming guidance from local .env API credentials.
---

# Media Metadata APIs

Use this skill to query TMDB, AniDB, and TVDB metadata safely from local credentials, then reconcile results for media-library matching.

## Workflow

1. Prefer the reusable `scripts/metadata_lookup.py` helper for TMDB, TVDB, and AniDB lookups instead of creating one-off query scripts. Use one-off code only when the helper cannot express the needed query yet.
2. Read credentials from the user's project .env; never ask the user to paste secrets again.
3. Do not print API keys, bearer tokens, or AniDB client secrets in tool output.
4. Prefer TMDB for broad movie/TV discovery and external IDs.
5. Prefer TVDB for TV season/episode order, series metadata, and TVDB-specific IDs.
6. Prefer AniDB for anime-specific entries, aliases, episode counts, and AniDB `aid` records.
7. When matching anime, search titles locally or via other providers first, then query AniDB by `aid`.
8. Return concise, source-labeled results with IDs, dates, titles, and confidence notes.


## Reusable Lookup Script

Use `scripts/metadata_lookup.py` as the standard command-line entry point for metadata queries. It uses only Python's standard library, reads credentials from the current working directory `.env` by default, accepts `--env` for an explicit credential file, masks secrets by design, refreshes `TVDB_TOKEN` when needed, and outputs JSON suitable for downstream organizer scripts.

Common commands:

```powershell
python scripts\metadata_lookup.py tmdb movie --id 477776 --pretty
python scripts\metadata_lookup.py tmdb movie --query "Code Geass Lelouch of the Rebellion Initiation" --year 2017 --pretty
python scripts\metadata_lookup.py tmdb tv --query "Code Geass" --limit 5 --pretty
python scripts\metadata_lookup.py tvdb series --query "Code Geass" --limit 5 --pretty
python scripts\metadata_lookup.py tvdb series --id 79525 --pretty
python scripts\metadata_lookup.py anidb --aid 14238 --pretty
```

Supported query modes:

- `tmdb movie --id <id>` or `tmdb movie --query <title> [--year YYYY]`.
- `tmdb tv --id <id>` or `tmdb tv --query <title> [--year YYYY]`.
- `tvdb series --id <id>` or `tvdb series --query <title>`.
- `tvdb movie --id <id>` or `tvdb movie --query <title>`.
- `anidb --aid <aid>`.

Prefer the script's JSON output as the authoritative intermediate format when building Jellyfin rename plans. For Jellyfin title selection, combine the returned provider ID, date/year, English title, original title, original language, aliases, and external IDs with the active Jellyfin naming rules.

## Environment

Expect these variables in `.env` when available:

```env
TMDB_READ_ACCESS_TOKEN=
TMDB_API_KEY=
ANIDB_CLIENT=
ANIDB_CLIENT_VERSION=1
ANIDB_PROTO_VERSION=1
TVDB_API_KEY=
TVDB_TOKEN=
TVDB_TOKEN_EXPIRES_AT=
```

`TVDB_PIN` is optional. If it is absent or blank, omit the `pin` field entirely when logging in.

For exact request shapes and endpoint notes, read `references/api-guide.md` when implementing queries.

## Validation

Use `scripts/test_metadata_apis.ps1` to verify credentials from a project `.env`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\test_metadata_apis.ps1 -EnvPath .env
```

The script should report status only and mask secrets. If network access is sandboxed, rerun with the required approval instead of changing the workflow.

## Safety

- Treat any pasted key or token as exposed and suggest rotation.
- Keep `.env` ignored by git.
- Cache TVDB bearer tokens until `TVDB_TOKEN_EXPIRES_AT`; refresh if missing, expired, or rejected.
- Respect AniDB HTTP API rate limits. Use at least a 2 second delay between AniDB requests and cache responses aggressively.


