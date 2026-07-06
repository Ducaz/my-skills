# API Guide

## TMDB

Use TMDB API v3 endpoints with the v4 read access token as a bearer token.

Headers:

```http
Authorization: Bearer ${TMDB_READ_ACCESS_TOKEN}
Accept: application/json
```

Useful endpoints:

```text
GET https://api.themoviedb.org/3/configuration
GET https://api.themoviedb.org/3/search/movie?query={title}&year={year}
GET https://api.themoviedb.org/3/search/tv?query={title}&first_air_date_year={year}
GET https://api.themoviedb.org/3/movie/{movie_id}?append_to_response=external_ids,alternative_titles,images,translations
GET https://api.themoviedb.org/3/tv/{series_id}?append_to_response=external_ids,alternative_titles,images,translations
GET https://api.themoviedb.org/3/tv/{series_id}/season/{season_number}
```

Use `TMDB_API_KEY` only for clients that require query-string v3 auth.

## AniDB HTTP API

AniDB HTTP API is client-identified rather than API-key based. Required query parameters:

```text
client=${ANIDB_CLIENT}
clientver=${ANIDB_CLIENT_VERSION}
protover=${ANIDB_PROTO_VERSION}
```

Anime record query:

```text
GET http://api.anidb.net:9001/httpapi?client={client}&clientver={clientver}&protover={protover}&request=anime&aid={aid}
```

Title matching:

1. Prefer known AniDB `aid` if available.
2. Otherwise use cross-provider IDs, title aliases, or AniDB title dump matching.
3. Cache results and throttle AniDB requests. Use at least 2 seconds between calls.

Validated local defaults:

```env
ANIDB_CLIENT=ducazjellyfin
ANIDB_CLIENT_VERSION=1
ANIDB_PROTO_VERSION=1
```

## TVDB v4

TVDB requires login with the API key to obtain a bearer token.

Login:

```http
POST https://api4.thetvdb.com/v4/login
Content-Type: application/json
```

Body without PIN:

```json
{"apikey":"${TVDB_API_KEY}"}
```

Body with PIN only when present:

```json
{"apikey":"${TVDB_API_KEY}","pin":"${TVDB_PIN}"}
```

Subsequent requests:

```http
Authorization: Bearer ${TVDB_TOKEN}
Accept: application/json
```

Useful endpoints:

```text
GET https://api4.thetvdb.com/v4/search?query={title}&type=series
GET https://api4.thetvdb.com/v4/search?query={title}&type=movie
GET https://api4.thetvdb.com/v4/series/{id}
GET https://api4.thetvdb.com/v4/series/{id}/extended
GET https://api4.thetvdb.com/v4/series/{id}/episodes/{season-type}
GET https://api4.thetvdb.com/v4/movies/{id}
GET https://api4.thetvdb.com/v4/movies/{id}/extended
```

Maintain:

```env
TVDB_TOKEN=
TVDB_TOKEN_EXPIRES_AT=
```

Refresh if the token is missing, expired, or a request returns unauthorized.

## Output Pattern

When presenting matched metadata, include:

- Provider and ID: TMDB movie/TV ID, TVDB ID, AniDB aid.
- Main title, original title, aliases, and year/date.
- Type: movie, TV series, anime TV, OVA, special, season, episode.
- Episode/season counts when relevant.
- External IDs such as IMDb, TVDB, TMDB, or AniDB when available.
- Confidence note explaining why the match is likely or ambiguous.
