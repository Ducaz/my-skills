---
name: danbooru-tags
description: Convert images, scene descriptions, mixed image-and-text instructions, or tag queries into Danbooru tags. Validate tags against Danbooru, support positive and negative prompts, and add concise natural-language complements for crucial details without qualifying tags. Use for Danbooru, booru, SD, and SDXL tagging requests. Never generate or edit images.
---

# Danbooru Tags

Convert the user's intended subject, scene, or tag query into a concise set of canonical Danbooru tags.

## Non-negotiable contract

- Never generate, edit, or transform an image. Never call an image-generation tool.
- Format every successful result as Markdown. Put each tag list in its own fenced `text` code block so it remains copy-ready.
- Provide a `Tags` block for positive-only results. When negative tags are included, title the two blocks `Positive Tags` and `Negative Tags`. If the user explicitly requests only negative tags, return only a `Negative Tags` block.
- Add brief explanatory prose only when it helps clarify ambiguity, interpretation, substitutions, omissions, parameter handling, negative-tag choices, or validation issues. Keep prose outside the code blocks so it cannot be mistaken for prompt tokens.
- Keep canonical underscore-form names throughout candidate generation and API validation. In the final code blocks only, replace every underscore with a space: render `full_body` as `full body`. Apply this display transformation to positive, negative, validated, and unverified tags alike.
- Add a `Natural Language Complement` only when one or more crucial required visual elements have no qualifying Danbooru equivalent. A candidate is not qualifying when it is nonexistent, invalid, empty, deprecated, or below `min-post-count`. Place the complement after all tag blocks in its own fenced `text` code block.
- Attempt to validate every emitted tag during the current request. Do not rely on memory, apparent familiarity, user spelling, or a prior request's results when current validation is available.
- After successful validation, emit a tag only when the Danbooru Tags API confirms that its canonical name exists, has `is_deprecated=false`, and has `post_count >= min-post-count`.
- After successful validation, omit rejected candidates. Never present a rejected or unverified token as validated.
- If operational validation fails, return the candidate tags under the explicit unverified fallback format below.

## Parameters

Accept parameters anywhere in the request:

```text
$danbooru-tags min-post-count=1000 quality-boosters=false
```

- `min-post-count=<int>`: Apply this minimum to every emitted tag. Default to `1000`. Require an integer of at least `1`.
- `quality-boosters=<boolean>`: When `true`, consider relevant quality-oriented Danbooru tags; default to `false`. Accept only `true` or `false`, case-insensitively. Boosters must pass the same minimum count and validation rules.

Do not silently clamp or reinterpret an invalid parameter. Ask for a corrected value without attempting a tag result.

## Classify the input

Handle all four modes:

1. **Reference images only**: Describe the visible target internally and select tags that reproduce it as closely as the frequency threshold permits.
2. **Text only**: Accept natural language, irregular or noncanonical tags, or a mixture. Infer the coherent image the user intends; treat supplied tokens as semantic hints, not verified tags.
3. **Images plus text**: Use the images as the visual base and the text as requirements for the desired output. Explicit additions, removals, substitutions, emphasis, and style requests in the text override conflicting reference-image details. Preserve unrelated visible details.
4. **Direct tag query**: Return only the valid tags requested or the closest valid tags that directly satisfy the query. Do not invent a full scene or pad the answer with generic prompt tags.

When a request could be either text-to-scene or a direct tag query, treat it as a direct query if the user asks to find, list, identify, verify, translate, or suggest tags. Otherwise treat it as text-to-scene.

## Build candidates

1. Parse parameters before selecting tags.
2. Inspect every supplied image at sufficient detail. Use the local image viewer for filesystem images. If a required image is missing or inaccessible, request it rather than guessing.
3. Build an internal representation appropriate to the mode:
   - Scene modes: subject count/type, identity, appearance, clothing, pose/action, expression/gaze, framing/viewpoint, environment, objects, lighting/color, and medium/style.
   - Direct query: requested concept, requested breadth, and any exclusions or category constraints.
4. Resolve contradictions before tagging. Prefer explicit text requirements, then central visible evidence, then conservative inference.
5. Convert concepts to plausible Danbooru snake_case candidates. Search the Danbooru tag-search or autocomplete APIs when spelling, canonical form, category, or terminology is uncertain.
6. Do not infer an artist from visual style. Include artist tags only when explicitly requested or reliably identified from supplied metadata. Include character and copyright tags only when explicitly requested or confidently identifiable.
7. Prefer common, visually meaningful tags. Avoid redundant, weakly implied, contradictory, model-specific, or decorative tags. Do not invent compound tags from individually valid words.
8. Maintain separate positive and negative candidate sets. Place a candidate in the negative set only when the user explicitly excludes a concept, a mixed-input edit removes a visible feature, or excluding a likely unwanted interpretation would materially improve generation. Do not add generic negative-prompt boilerplate.
9. Use bare canonical names in the negative set. The separate `Negative Tags` heading conveys negative-prompt semantics; do not prefix tags with `-`.
10. Track crucial required visual elements that appear in the intended scene but cannot yet be represented faithfully by qualifying tags. Resolve them under the natural-language complement rules after tag discovery and validation.

## Validate in bulk

Place the union of positive and negative candidates in a temporary UTF-8 text file, one tag per line, and run from this skill directory:

```powershell
python scripts/validate_tags.py --input <candidate-tags.txt> --min-post-count 1000 --output <validated.json>
```

Substitute the resolved threshold. For authenticated requests, optionally add `--login <name> --api-key <key>`; never print, log, or save the API key in an output artifact.

The validator queries `/tags.json` in batches and places only current, nonempty tags meeting the threshold in `accepted`. When the validator succeeds, build both output blocks exclusively from those `accepted` records, then restore each accepted tag to its positive or negative set.

For `not_found`, `deprecated`, `empty`, or `below_min_post_count` candidates, use Danbooru tag search, aliases, or autocomplete to find a semantically faithful alternative, then bulk-validate the replacement. Do not replace a specific concept with a broader tag when doing so changes the user's meaning. If no faithful candidate passes all validation and threshold rules, treat the required concept as having no qualifying equivalent: omit the rejected tag and consider the concept for the natural-language complement.

Read [references/danbooru-api.md](references/danbooru-api.md) when changing endpoint behavior, interpreting tag categories, or diagnosing API failures. Treat rate limits, network errors, HTML challenge pages, malformed JSON, partial batches, and nonzero validator exits as potential validation failures, then classify them under the fallback rules below.

Delete temporary files after validation unless the user asks to retain them.

## Validation-failure fallback

Distinguish a tag rejection from an operational validation failure:

- A functioning API that returns `not_found`, `deprecated`, `empty`, or `below_min_post_count` for a candidate is a successful validation result. Omit or replace that candidate normally; do not use the unverified fallback. If no faithful replacement qualifies, the rejected candidate may make a crucial required concept eligible for the natural-language complement.
- A timeout, connection failure, rate limit, server error, HTML challenge page, malformed or incomplete response, or exhausted retry sequence is an operational validation failure. Use the fallback.
- Fix a local invocation or temporary-file error and retry validation before using the fallback. Do not disguise a correctable local error as an API outage.

On operational failure:

1. Keep the intended positive and negative sets separate.
2. Normalize candidates to the most plausible canonical snake_case form and remove duplicates, contradictions, speculative details, and weak alternatives.
3. Return the remaining candidates even though their existence, canonical spelling, deprecation status, category, and post counts could not be confirmed.
4. Place a prominent warning before the tag blocks and mark every returned block as unverified beneath its standard heading.
5. Do not claim that `min-post-count` was enforced. State that the requested threshold could not be confirmed.
6. Do not include raw exception traces, credentials, API keys, or verbose diagnostics.

## Negative Tags

Use negative tags conservatively. Include them when at least one of these conditions applies:

- The user says to exclude, avoid, remove, omit, or render without a concept.
- Text instructions replace or remove a feature visible in a reference image.
- The intended scene has a strong, predictable ambiguity that a small negative set can resolve.
- The user explicitly requests a negative prompt.

Omit the negative block for ordinary direct tag queries unless the user asks for exclusions or negative-prompt suggestions. Do not add routine quality negatives merely because they are popular. Never place the same tag in both positive and negative sets; resolve the contradiction from the user's explicit intent before output.

When validation succeeds, every negative tag must independently pass the same existence, deprecation, and `min-post-count` checks as every positive tag. When validation fails operationally, apply the same unverified warning and labeling to the negative block.

## Natural-language complement

Use natural language only as a last-mile complement to the tags, never as a second full prompt.

1. Consider a complement only for scene-generation modes: reference images, text-only scene instructions, and images plus text. Omit it for ordinary direct tag queries unless the user explicitly asks how to express a crucial untaggable visual detail.
2. Search plausible canonical names, synonyms, aliases, successors to deprecated tags, and related tags before concluding that no qualifying Danbooru equivalent exists.
3. Define a qualifying equivalent as a semantically faithful tag that exists, is nonempty, is not deprecated, and has `post_count >= min-post-count`.
4. Count a required candidate as having no qualifying equivalent when it is `not_found`, invalid, `empty`, `deprecated` without a qualifying successor, or `below_min_post_count`, and no faithful alternative passes every rule. Express the underlying visual concept in natural language rather than copying the rejected tag verbatim.
5. Add a complement only when the missing detail is crucial to reproducing the intended image. Omit minor texture, mood, decorative, and speculative details.
6. Write one to three concise natural-language sentences. Describe only the uncovered visual elements and their necessary relationships; do not repeat information already expressed by positive or negative tags.
7. Prefer concrete visual wording over abstract interpretation, narrative, rationale, or instructions to the user.
8. Place the section after the positive and negative tag blocks, under the exact heading `Natural Language Complement`, in a fenced `text` code block.
9. Do not submit the sentences to the tag validator or imply that they are Danbooru tags.

Apply the same eligibility test to crucial required inclusions and exclusions. For an uncovered exclusion, use concise negative wording such as `No lettering appears anywhere in the image`; do not mix an unqualified rejected tag into the negative tag block.

If an operational API failure prevents determining whether qualifying equivalents exist, omit a new complement unless the absence of a qualifying equivalent was already established through a successful tag search during the same request. Do not use validation failure as permission to paraphrase uncertain candidates.

## Render tag lists

Preserve canonical underscore-form names until selection and validation are complete. Immediately before composing the final Markdown:

1. Replace every `_` in every displayed tag with a single space.
2. Preserve tag order, commas, parentheses, hyphens, and other characters.
3. Do not modify the temporary candidate file, API request values, or validator JSON to use display-form spaces.
4. Do not revalidate the display-form strings; their underscore-form source records are the validated identities.

For example, validate `full_body`, `blue_hair`, and `looking_at_viewer`, then display `full body, blue hair, looking at viewer`.

## Final selection and ordering

Keep only tags relevant to the requested image or query. Prefer the smallest set that preserves the important information; do not force a fixed tag count.

For scene outputs, order tags as follows:

1. subject count and subject type
2. character and copyright identity
3. major appearance and clothing
4. pose, action, expression, and gaze
5. framing, viewpoint, and composition
6. environment, objects, lighting, color, and medium
7. enabled and validated quality boosters

For direct queries, preserve the user's requested order when practical; otherwise order from the closest match to broader alternatives.

Default output:

````markdown
## Tags

```text
tag one, tag two, tag three
```
````

When negative tags are useful:

````markdown
## Positive Tags

```text
tag one, tag two, tag three
```

## Negative Tags

```text
negative tag one, negative tag two
```
````

When crucial visual elements have no qualifying Danbooru tags, append the complement after all tag blocks:

````markdown
## Positive Tags

```text
tag one, tag two, tag three
```

## Negative Tags

```text
negative tag one, negative tag two
```

## Natural Language Complement

```text
The red ribbon passes through three brass rings, loops back on itself, and knots around the left wrist. Its loose end traces an S-shaped curve toward the lower-right corner.
```
````

Use the same `Natural Language Complement` heading and placement when no negative block is present: put it immediately after `Tags`.

When an explanation is useful, append a short note after the complete prompt content, including the complement when present:

````markdown
## Tags

```text
tag one, tag two, tag three
```

Note: <brief explanation that does not introduce unvalidated prompt tokens>
````

When validation fails operationally, use this fallback format:

````markdown
> **Warning:** Danbooru validation failed. The tags below are unverified.

## Positive Tags

*Unverified.*

```text
candidate tag one, candidate tag two
```

## Negative Tags

*Unverified.*

```text
candidate negative tag
```

## Natural Language Complement

```text
Add only a crucial visual detail whose lack of an equivalent Danbooru tag was established before validation failed.
```
````

Omit the unverified negative block when no negative tags are useful. In that case, use the heading `Tags`, followed by the unverified marker. Omit the complement unless its eligibility was established before the operational failure. If validation later becomes available, rerun the full candidate union rather than treating fallback tags as previously verified.
