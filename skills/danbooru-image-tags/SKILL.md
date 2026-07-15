---
name: danbooru-image-tags
description: Analyze user-provided images and produce Danbooru tags for Stable Diffusion-style text-to-image reproduction, with Exact and Common modes and mandatory validation against the Danbooru Tags API. Use when a user uploads or references an image and asks for Danbooru tags, booru prompts, SD/SDXL prompt tags, image-to-prompt analysis, tag verification, or a detailed versus broadly learned tag set.
---

# Danbooru Image Tags

Analyze the visible image, translate observations into canonical Danbooru vocabulary, and return only API-validated tags. Support both detail-preserving Exact output and frequency-oriented Common output.

## Workflow

1. Inspect every supplied image at sufficient detail. Use the local image viewer for filesystem images. If the image is missing or inaccessible, request it instead of guessing.
2. Describe the image internally in layers: subject count, identity, appearance, clothing, pose/action, expression/gaze, composition/camera, environment, objects, lighting/color, and medium/style.
3. Convert only visible or confidently identifiable facts into plausible Danbooru snake_case tags. Do not tag hidden details, speculate about identity, or infer an artist from visual style alone.
4. Create a broad candidate union for both modes. Put canonical-looking tags in a temporary UTF-8 text file, one tag per line.
5. Run `scripts/validate_tags.py` against that file. The script queries Danbooru in batches, rejects nonexistent, empty, and deprecated tags, and records category and post count.
6. Reconsider rejected candidates. Replace them only when a valid canonical alternative is justified by the image, then validate again. Never silently present an unverified replacement.
7. Build Exact and Common outputs from the final validated records according to the rules below.
8. Return the image summary, both prompt lines, and a concise validation report. Delete temporary files unless the user asks to retain them.

## Exact mode

- Preserve distinctive visual details with the narrowest justified valid tags.
- Include useful low-frequency tags when the API confirms they are active and the detail is clearly visible.
- Prefer specific tags over redundant parent concepts when the specific tag already communicates the detail well; keep both only when image-generation models commonly benefit from both.
- Include character and copyright tags only when identity is confident. Format character tags exactly as Danbooru returns them.
- Do not invent combinations merely because individual words are valid.

## Common mode

- Favor tags likely to be broadly represented in Danbooru-trained or booru-captioned models.
- Include only active tags meeting the validator's Common threshold. Default to `post_count >= 1000`; honor a user-specified threshold.
- Prefer visually central general, composition, pose, expression, clothing, and environment tags.
- Omit rare micro-details and low-count identity tags. A valid tag is not automatically a Common tag.
- Keep the result compact and non-contradictory; target roughly 12–30 tags unless the image is unusually complex.

## Validation command

Run from the skill directory:

```powershell
python scripts/validate_tags.py --input <candidate-tags.txt> --common-min-count 1000 --output <validated.json>
```

For authenticated requests, optionally add `--login <name> --api-key <key>`. Never print or save the API key in output artifacts. Read [references/danbooru-api.md](references/danbooru-api.md) when changing endpoint behavior, interpreting categories, or diagnosing API failures.

The command exits nonzero if the API cannot validate all requests. Treat network errors, rate limits, HTML challenge pages, and malformed responses as validation failure. Report that final verification could not be completed; do not label candidates as verified.

## Ordering and output

Order prompt tags for practical generation:

1. subject count and subject type
2. character/copyright identity when justified
3. major appearance and clothing
4. pose, action, expression, and gaze
5. framing, viewpoint, and composition
6. environment, objects, lighting, color, and medium

Use this compact structure:

```markdown
Image: <one-sentence factual summary>

Exact (<N> validated tags):
<comma-separated tags>

Common (<N> validated tags, minimum count <threshold>):
<comma-separated tags>

Validation: <endpoint, validation time, accepted/rejected counts; list rejected candidates when useful>
```

Keep underscores because Danbooru and most booru-captioned models use them. Do not add quality boosters such as `masterpiece`, `best_quality`, or model-specific syntax unless the user explicitly requests them and they independently validate as Danbooru tags.
