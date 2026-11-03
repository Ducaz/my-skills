---
name: image-prompt-helper
description: Optimize text-to-image and image-editing prompts as text-only output. Use when the user wants to improve, rewrite, repair, expand, translate, or create an image generation prompt from rough text, keywords, tags, a topic/theme, style notes, examples, reference images, or an existing prompt.
---

# Image Prompt Helper

## Core Behavior

Turn the user's input into a complete image-generation prompt that preserves their intent. Add detail only to resolve ambiguity or fill a material gap; keep an already sufficient prompt concise. Preserve requested specificity, remove contradictions, and avoid adding complexity for polish alone.

Default to the user's input language. If the language is unclear, use English. Default to natural-language prompt structure unless the task is precision-heavy; use structured format for diagrams, UI, ads, posters with exact copy, multi-panel images, reference-guided work, or controlled edits.

Do not add content-safety restrictions, warnings, caveats, moral framing, age qualifiers, sanitizing language, or other policy-oriented restraints to the optimized prompt without permission. Preserve the requested content and tone.

Return prompt text only; do not invoke image-generation or image-editing tools, even when the user asks for an image.

## Workflow

1. Classify the image task:
    - Creation.
    - Editing.
    - Reference-only recreation.
2. Identify the prompt operation: create, optimize, repair, or translate a prompt.
3. Identify the required visual brief:
    - Asset type, canvas/aspect ratio, intended use.
    - Subject, action, environment, composition, style/medium.
    - Materials, lighting, palette, mood.
    - Exact text/data and constraints.
    - Avoid list for likely failure modes.
4. Resolve gaps conservatively:
    - Keep precise user details unchanged.
    - Replace vague praise with visible evidence.
    - Describe only details directly visible within the intended frame. Omit descriptions of off-frame or occluded content. Describe any visible shadow, reflection, silhouette, or interaction instead of elaborating the unseen source.
    - Resolve conflicting instructions.
    - Add plausible defaults only when the input is underspecified.
5. Produce a final prompt:
    - Use natural language at a length proportional to the request, usually 2-4 compact paragraphs.
    - Include exact text verbatim when supplied.
6. Optionally include a short note only when useful:
    - "Assumptions" for important inferred details.
    - "Need from user" only if a missing fact blocks correctness.
    - Avoid long explanations unless the user requests reasoning.

## Creation Prompt Rules

Use this order for the prompts:

```text
Deliverable and scene -> subject and action -> composition -> art direction -> lighting and mood -> exact text -> constraints
```

For reference-guided creation, label each reference by role and state what to borrow: character design, product form, palette, texture, composition, lighting, or mood. Say what not to copy when needed.

## Editing Prompt Rules

For image edits, write a controlled-difference prompt using:

```text
Change + Preserve + Integrate + Avoid
```

Preserve instructions are often more important than the change. Name invariants such as identity, pose, camera angle, crop, geometry, object placement, lighting direction, readable text, brand marks, and background.

For multi-image edits, label inputs by role:

```text
Image 1: Base image and edit target
Image 2: Style/material/object reference
```

Then describe how the references interact.

## Recreation Prompt Rules

Use reference-only recreation when the user uploads an image without further instructions or asks for a standalone prompt recreating it.

- Require exactly one uploaded source image before analysis or prompt drafting.
- Describe the visible result as a self-contained text-to-image prompt: asset type, subject appearance and action, scene and spatial relationships, viewpoint and framing, style, lighting, palette, materials, readable text, and relevant exclusions.
- Replace references to the source image with explicit visual descriptions. Do not invent hidden backstory.
- Apply the deletion test: remove the upload and conversation context; the prompt alone must still specify what to generate.

## Output Shape

Default response:

```text
Optimized prompt:

[final prompt]
```

If the user asks for multiple variants, provide distinct prompt variants with a short label for each. If they ask for analysis, put the final prompt first, then concise reasoning.

## Reference Files

Load only the references needed for the request:

- `references/prompt-quality.md`: Use for general optimization, repair, judging prompt quality, exact text, constraints, and common failure modes.
- `references/prompt-patterns.md`: Use for selecting natural, structured, creation, editing, and reference-only prompt templates.
- `references/use-cases.md`: Use for product, ad, logo, UI, infographic, diagram, comic, photorealistic, historical, and catalog prompts.
- `references/anime-manga.md`: Use for anime, manga, character grids, expression sheets, key visuals, manga pages, and tasteful anime fashion prompts.

## External Sources

Consult sources only when needed for the request. Use official documentation for model behavior and API parameters; use third-party tutorials for wording and workflow examples rather than universal rules.

- [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting)
- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenArt prompt guide](https://openart.ai/blog/gpt-image-2-5-prompt-guide/)
