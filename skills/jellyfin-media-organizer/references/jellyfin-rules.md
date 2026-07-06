# Jellyfin Media Folder Rules

This reference summarizes Jellyfin's official Movies and TV Shows media naming guidance plus practical cleanup checks.

Official sources:

- https://jellyfin.org/docs/general/server/media/movies/
- https://jellyfin.org/docs/general/server/media/shows/

## Top-Level Folder Names

Top-level media folders should be stable matching keys, not release descriptions.

Recommended forms:

```text
Movies/Movie Title (Year) [providerid-id]/
Shows/Series Title (Start Year) [providerid-id]/
Shows/Anime Title (Start Year) [providerid-id]/
```

Provider ID selection:

- Use `[tmdbid-...]` or `[imdbid-tt...]` for standalone movies.
- Use `[tvdbid-...]` or `[tmdbid-...]` for TV series and multi-season anime when those providers represent the whole series.
- Use `[anidbid-...]` for a single AniDB anime work, especially one-season anime or libraries intentionally matched through AniDB.
- Avoid using one season's AniDB `aid` on a top-level folder that contains multiple seasons, OVAs, or works with separate AniDB entries.
- If NFO files already contain trusted provider IDs, prefer those over fuzzy title matching.

Remove from canonical top-level names:

- Release groups: `[Judas]`, `[VCB-Studio]`, `[Cerberus]`
- Technical tags: `[BD 1080p]`, `[HEVC x265]`, `[10bit]`, `[FLAC]`
- Language tags: `[Dual-Audio]`, `[Eng-Subs]`
- Bundle descriptions: `S1 + S2`, `Seasons 1-2 + Movies + OVAs`

Examples:

```text
[Cerberus] Fate Stay Night Unlimited Blade Works S1 + S2 + Special [BD 1080p HEVC 10-bit AAC]
-> Fate Stay Night Unlimited Blade Works (2014)

Kakegurui [BD][1080p][HEVC 10bit x265][Dual Audio][Tenrai-Sensei]
-> Kakegurui (2017) [tvdbid-327572]

[VCB-Studio] Shingeki no Kyojin
-> Shingeki no Kyojin (2013) [tvdbid-267440]

Fate Grand Order - Absolute Demonic Front Babylonia [BD][1080p][HEVC 10bit x265][Dual Audio]
-> Fate Grand Order Absolute Demonic Front Babylonia (2019) [anidbid-14238]
```

## Movies

Use the `Movies` library type for films. Organize each movie in its own folder:

```text
Movies/
`-- Movie Name (year) [metadata provider id]/
    |-- Movie Name (year) [metadata provider id].mkv
    |-- Movie Name (year) [metadata provider id].en.srt
    |-- Movie Name (year) [metadata provider id].nfo
    |-- folder.jpg
    `-- backdrop.jpg
```

Rules:

- Prefer names matching the metadata provider.
- Include year and provider ID when available; both improve matching.
- Keep the video filename identical to the parent folder, except for supported suffixes.
- Keep standalone films in Movies libraries, including theatrical franchise films and recap films that have their own TMDb/IMDb movie entries.
- Avoid reserved characters in media names: `<`, `>`, `:`, `"`, `/`, `\`, `|`, `?`, `*`.
- Prefer remuxed `mkv` over `.iso`; `VIDEO_TS` and `BDMV` folders are supported but limited.

Provider ID examples:

```text
Movie Name (2030) [imdbid-tt00000000]
Movie Name (2030) [tmdbid-12345]
Series Name (2021) [tvdbid-12345]
```

Multi-version movies:

```text
Movie (2021) [tmdbid-12345]/
|-- Movie (2021) [tmdbid-12345] - 2160p.mkv
|-- Movie (2021) [tmdbid-12345] - 1080p.mkv
`-- Movie (2021) [tmdbid-12345] - Directors Cut.mkv
```

The prefix before ` - ` must match the parent folder exactly. Use `space hyphen space` before a version label.

## Shows

Use the `Shows` library type for TV/anime series:

```text
Shows/
`-- Series Name (year) [metadata provider id]/
    |-- Season 00/
    |   `-- Series Name S00E01 - Special Title.mkv
    |-- Season 01/
    |   |-- Series Name S01E01.mkv
    |   `-- Series Name S01E02.mkv
    `-- Season 02/
        `-- Series Name S02E01.mkv
```

Rules:

- Do not use a show folder as a catch-all franchise bundle for standalone films.
- Prefer `Season 01`, `Season 02`, etc. Use zero-padded season numbers for consistency.
- Use `Season 00` for specials that the metadata provider lists.
- Use `SxxExx` in episode filenames.
- Preserve known episode titles after the normalized episode code: `Series Name S01E01 - Title.mkv`.
- For multi-episode files, use a range such as `Series Name S01E01-E02.mkv` only when the file truly contains both episodes.
- For split parts of the same episode, use supported part labels such as `part-1`, `part-2`.

Title preservation:

- Keep the normalized `SxxEyy` token near the front of the filename for Jellyfin matching.
- Append meaningful episode, special, OVA, or OAD titles after `space hyphen space`.
- Use titles from metadata providers, `.nfo` files, or the original release filename.
- Do not preserve codec/release tags as titles; move those out of the canonical name unless the user explicitly wants them.
- Rename same-stem sidecars to match the new titled stem.

Examples:

```text
Series Name 1x01 - Pilot.mkv
-> Series Name S01E01 - Pilot.mkv

Series Name OAD01 (3.5) Ilse's Notebook.mkv
-> Series Name S00E01 - OAD01 (3.5) - Ilse's Notebook.mkv

Series Name Special.mkv
-> Series Name S00E01 - Sunny Day.mkv
```

Specials:

- Put listed specials in `Season 00`.
- Episode numbering can vary between metadata providers.
- Preserve the special title after `S00E##` when available: `Series Name S00E01 - Special Title.mkv`.
- For anime OVA/OAD entries, preserve useful original labels after the normalized code, e.g. `S00E04 - OAD04 (0.5A) - No Regrets Part 1`.
- Do not put standalone theatrical movies in `Season 00` when they have independent movie metadata; place them in a Movies library instead.
- If the provider does not list a special, prefer a descriptive filename instead of a fabricated `S00E##`.
- Specials can be displayed within aired seasons through Jellyfin settings and metadata fields, but they still live in `Season 00`.

## Subtitles and External Audio

Place external subtitles/audio beside the matching video and keep the same stem:

```text
Series Name S01E01.mkv
Series Name S01E01.zh.srt
Series Name S01E01.en.forced.ass
Series Name S01E01.commentary.ja.aac
```

Common flags:

- `default`
- `forced` or `foreign`
- `sdh`, `cc`, or `hi` for hearing impaired; avoid bare `hi` when it may be Hindi.

When renaming video stems, rename same-stem subtitles/audio together.

## Extras

Supported extras folders include:

```text
behind the scenes/
deleted scenes/
interviews/
scenes/
samples/
shorts/
featurettes/
clips/
other/
extras/
trailers/
theme-music/
backdrops/
```

Use these for trailers, PV/CM clips, NCOP/NCED, scans, menus, samples, featurettes, and miscellaneous bonus videos unless they are actual metadata-provider specials.

Single-file extras can also use names such as `trailer.ext` or `sample.ext`, or suffixes such as `.trailer`, `-sample`, `-clip`, `-featurette`, `-other`, or `-extra`.

## Audit Checklist

Before changing files:

- Confirm the library type.
- Check for Movies/Shows mixing, especially standalone theatrical films nested under show folders.
- Audit top-level folder names for release groups, codec/source tags, bundle descriptions, missing years, and missing provider IDs.
- Count videos before and after.
- List root-level videos and root-level NFO files.
- Find folders with leading/trailing spaces.
- Find `Season 1`, `Season 2`, `Specials`, `Other`, and `Trailers` folders.
- Detect same target path collisions.
- Inspect `.nfo` for provider IDs and titles when filenames are ambiguous.

Common fixes:

```text
[Group] Title S1 + S2 [BD 1080p] -> Title (2014) [tvdbid-12345]
Title [BD][HEVC][Dual Audio] -> Title (2017) [tvdbid-12345]
Season 1       -> Season 01
Season 2       -> Season 02
Specials       -> Season 00
 Season 01     -> Season 01
Trailers       -> trailers
Other          -> other
Title 1x01.mkv -> Title S01E01.mkv
Title 1x01 - Name.mkv -> Title S01E01 - Name.mkv
Title OVA01 - Name.mkv -> Title S00E01 - OVA01 - Name.mkv
```

After changing files:

- Verify expected video counts per season/folder.
- Verify no unintended root-level videos remain.
- Verify subtitles, audio tracks, NFO files, and posters moved with their videos.
- Verify specials/OVAs/OADs with known titles did not become bare `S00E##` filenames.
- Report remaining ambiguous files rather than guessing.
