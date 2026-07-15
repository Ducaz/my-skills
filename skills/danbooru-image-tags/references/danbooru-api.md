# Danbooru tag validation reference

## Read endpoint

Use the public JSON endpoint:

```text
GET https://danbooru.donmai.us/tags.json
```

Batch exact normalized names with `search[name_normalize]` as a comma-separated value. Keep batches small enough to avoid excessive URL length. The validator defaults to 50 names per request.

Useful parameters:

- `search[name_normalize]`: normalized exact names, comma-separated
- `limit`: maximum records returned for the batch

The API record fields used by this skill are:

- `name`: canonical tag spelling
- `category`: `0` general, `1` artist, `3` copyright, `4` character, `5` meta
- `post_count`: current number of tagged posts
- `is_deprecated`: whether Danbooru has deprecated the tag

## Validity policy

Accept a tag only when:

- the response contains the exact normalized name;
- `post_count` is greater than zero; and
- `is_deprecated` is false.

Do not count an HTTP success alone as validation. Missing records, empty tags, and deprecated tags are rejected. This skill deliberately does not auto-resolve aliases: an alias or typo must be reconsidered by the image-analysis step and its canonical replacement must be validated in a new pass.

## Frequency policy

Exact mode has no minimum count beyond `post_count > 0`. Common mode defaults to `post_count >= 1000`. The threshold is a reproducibility heuristic, not a Danbooru validity rule and not a guarantee that a particular checkpoint learned the tag.

## Failure policy

Retry transient HTTP `429` and `5xx` responses with bounded exponential backoff. Fail closed after retries. Treat non-JSON responses, unexpected response shapes, and partial batch failures as incomplete validation.

Public reads usually work without authentication. For repeated use, authentication may be supplied with Danbooru login and API key query parameters. Keep credentials out of logs and saved reports.
