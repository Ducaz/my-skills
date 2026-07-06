---
name: jellyfin-media-organizer
description: Organize, audit, and safely rename media folders for Jellyfin Movies and Shows libraries. Use when Codex needs to plan or perform Jellyfin-compatible file structure cleanup for movies, TV/anime series, seasons, specials, OVAs, extras, subtitles, audio tracks, NFO/poster sidecars, multi-version movies, multi-part files, or NAS/media-library directories.
---

# Jellyfin Media Organizer

## Operating Principles

Prefer Jellyfin's official media naming conventions over release-group names. Preserve files first, rename second, and verify after every batch.

When modifying real media folders:

1. Inspect the existing tree before planning changes.
2. Classify content as movie, show, season episode, special/OVA/OAD, extra, subtitle, audio track, image, or metadata sidecar.
3. Normalize the top-level title folder before normalizing season and episode files.
4. Build a dry-run move plan and check for collisions before changing anything.
5. Move videos together with matching `.nfo`, subtitles, audio tracks, and artwork sidecars.
6. Verify counts and final paths after changes.

Avoid deleting media. Move unknown files into a supported extras folder such as `extras` or `other`, or leave them in place and report them.

## Quick Rules

Use a `Movies` library for standalone films:

```text
Movies/
`-- Movie Name (2021) [tmdbid-12345]/
    |-- Movie Name (2021) [tmdbid-12345].mkv
    |-- Movie Name (2021) [tmdbid-12345].zh.srt
    `-- folder.jpg
```

Keep `Movies` and `Shows` libraries conceptually separate. Do not bury standalone films inside a show folder merely because they share a franchise. If a theatrical film, recap film, or OVA movie is a standalone TMDb/IMDb movie entry, prefer a Movies-library folder for it. Use `Season 00` only for specials/OVAs/OADs that belong to the series metadata order.

Use canonical title folders. Strip release-group, codec, resolution, source, and bundle tags from top-level library folder names:

```text
Movie Title (2021) [tmdbid-12345]
Series Title (2021) [tvdbid-12345]
Anime Title (2021) [anidbid-12345]
```

Use a `Shows` library for TV/anime series:

```text
Shows/
`-- Series Name (2021) [tvdbid-12345]/
    |-- Season 00/
    |   `-- Series Name S00E01 - OVA.mkv
    |-- Season 01/
    |   `-- Series Name S01E01.mkv
    `-- Season 02/
        `-- Series Name S02E01.mkv
```

Use `Season 00` for specials, OVAs, recaps, unaired episodes, and other provider-listed specials. If a special is not listed by the metadata provider, use a descriptive filename rather than inventing a misleading `S00E##`.

When an episode, special, OVA, or OAD has a known title, preserve it after the normalized identification token:

```text
Series Name S00E01 - OVA Title.mkv
Series Name S01E01 - Episode Title.mkv
```

Treat the `Series Name SxxEyy` prefix as the machine-readable matching key and the trailing ` - Title` text as human-readable metadata. Keep useful source titles from release names, NFO files, or metadata providers unless the title is only a codec/release tag.

## Workflow

1. **Gather context**
   - Identify the Jellyfin library type: `Movies`, `Shows`, or mixed/unclear.
   - Flag mixed libraries or franchise bundles that combine standalone movies with TV seasons.
   - List top-level folders and one or two levels beneath them.
   - Look for existing provider IDs such as `[tmdbid-...]`, `[tvdbid-...]`, `[imdbid-tt...]`, or `[anidbid-...]`.
   - Inspect NFO files when present; they often reveal title, year, provider ID, season, and episode intent.

2. **Resolve canonical metadata**
   - Prefer existing trusted IDs from NFO files or folder names before searching.
   - For file and folder names, use the original official title only when that title is Chinese, including Simplified or Traditional Chinese.
   - For all non-Chinese original titles, prefer the official English title or the provider's English display title. Use romanized or original non-English titles only when no reliable English title exists or when the user explicitly requests that style.
   - Treat other localized translations as secondary aliases unless the user explicitly asks for a localized library style.
   - For standalone movies, prefer TMDb or IMDb IDs.
   - For multi-season shows and anime series, prefer a whole-series ID such as TVDB or TMDb TV.
   - Use AniDB IDs for single anime works or when the Jellyfin library/plugin is expected to match AniDB directly.
   - Avoid putting a single-season AniDB `aid` on a top-level folder that contains multiple AniDB entries/seasons.

3. **Normalize top-level folders**
   - Movies: `Canonical Movie Title (Year) [providerid-id]`.
   - Shows: `Canonical Series Title (Start Year) [providerid-id]`.
   - Remove release-group brackets, collection phrases, source/codec/resolution tags, audio/subtitle tags, and "S1 + S2" bundle notes.
   - Use clear romanized or provider-facing titles for ASCII-friendly NAS paths when appropriate; keep the provider ID as the authoritative disambiguator.
   - Examples: `[Group] Title S1 + S2 [BD 1080p]` -> `Title (2014) [tvdbid-12345]`; `Title [BD][HEVC]` -> `Title (2017) [tvdbid-12345]`.

4. **Design the target tree**
   - For movies, create one folder per movie and keep the video filename aligned with the folder name.
   - For shows, create one folder per series, then `Season 01`, `Season 02`, and `Season 00` as needed.
   - Move standalone movie entries out of show-style layouts in the plan, or explicitly report them when the current library root cannot safely mix Movies and Shows.
   - Keep release-quality tags out of canonical folder names unless the user explicitly wants them preserved.

5. **Plan moves**
   - Pair sidecars by stem: `.nfo`, `-poster.jpg`, subtitles, and external audio should move with the corresponding video.
   - Preserve meaningful episode/special titles by appending them after the normalized code: `S00E01 - Title`, `S01E01 - Title`.
   - Preserve unrelated checksum files such as `.sfv` unless the user asks to remove them.
   - Detect target path collisions before moving.
   - Show the plan if the mapping is ambiguous or destructive; otherwise proceed with a safe dry-run internally before execution.

6. **Execute and verify**
   - Create target folders before moving files.
   - Move or rename files atomically within the same filesystem where possible.
   - Verify top-level folder names, season folders, episode counts, root-level strays, empty old folders, and naming conformity.
   - Report what changed and any items needing manual metadata review.

## Naming Heuristics

Top-level folder selection:

- Prefer Chinese original official titles when the work's official title is in Simplified or Traditional Chinese.
- For works whose original official title is not Chinese, prefer the official English title or provider English display title over the original non-English title and over localized translations.
- Prefer provider canonical/English titles over release names. If provider metadata exposes original, localized, and English titles, choose Chinese original titles for Chinese-titled works; otherwise choose English. Rely on the provider ID for matching and disambiguation.
- Keep the year immediately after the title.
- Add exactly one strong provider ID when available: `[tmdbid-...]`, `[tvdbid-...]`, `[imdbid-tt...]`, or `[anidbid-...]`.
- For multi-season anime, use TVDB/TMDB series IDs when they represent the combined series better than per-season AniDB aids.
- For single-season anime or a single AniDB work, `[anidbid-...]` is acceptable and often useful.
- Do not keep tags such as `[BD 1080p]`, `[HEVC x265]`, `[Dual-Audio]`, fansub/release groups, or "Seasons 1-2 + OVAs" in the canonical top-level folder.

Normalize show episode patterns:

- `1x01` -> `S01E01`
- `2x13` -> `S02E13`
- `S1E1` -> `S01E01`
- `Season 1` -> `Season 01`
- `Specials` -> `Season 00`

Treat `1x00`, `S01E00`, `SP`, `OVA`, `OAD`, `NCOP`, and `NCED` cautiously. Decide whether they belong in `Season 00`, the aired season, or an extras folder based on provider metadata and user intent.

Prefer normalized names with retained titles:

- `Title 1x01 - The Beginning.mkv` -> `Title S01E01 - The Beginning.mkv`
- `Title OAD01 (3.5) Ilse's Notebook.mkv` -> `Title S00E01 - OAD01 (3.5) - Ilse's Notebook.mkv`
- `Title Special.mkv` -> `Title S00E01 - Special Title.mkv` when the title can be inferred from NFO/provider/release context.

For anime:

- Put main cours/seasons in numbered `Season ##` folders.
- Put provider-listed OVA/OAD/Special episodes in `Season 00`.
- Retain OVA/OAD/special titles after the `S00E##` token, including original numbering cues such as `OAD01`, `OVA02`, or source chronology markers when they help identify the work.
- Put creditless OP/ED, PVs, CM collections, menus, and scans in supported extras folders unless they are actual provider-listed specials.
- If a film is a standalone TMDb/IMDb movie entry, prefer a Movies library entry instead of burying it inside a show folder or `Season 00`.

## References

Read [references/jellyfin-rules.md](references/jellyfin-rules.md) when you need detailed examples, edge-case rules, or an audit checklist.
