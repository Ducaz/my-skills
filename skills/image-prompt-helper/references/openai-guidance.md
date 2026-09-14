# OpenAI Image Prompting Guidance

Reviewed: September 14, 2026. Scope: text prompts for Codex ImageGen and ChatGPT Images, including Images 2.5.

## Current Model Context

OpenAI describes Images 2.5 as improving reference-subject fidelity, targeted editing, multi-turn consistency, lighting, textures, and complex visual instructions. These improvements do not remove the need to specify important visual constraints. See the [September 8 release post](https://openai.com/index/introducing-chatgpt-images-2-5/).

The underlying 2.5 family includes Flare (speed-oriented) and Sunburst (quality-oriented).
[Current prompting guide](https://developers.openai.com/api/docs/guides/image-prompting)

## Prompting Fundamentals

- Follow the concise, complete standard in `prompt-quality.md`; use labels only where they make complex constraints easier to understand.
- Include intended use when it affects the image, such as an advertisement, interface preview, or instructional diagram.
- Specify concrete materials, lighting, colors, and medium. Request photorealism explicitly when needed; camera terminology guides appearance rather than guaranteeing physical simulation.
- Preserve supplied wording exactly and specify its placement and hierarchy. Supply important facts and data rather than asking the image model to invent them.
- For edits, identify the requested change and relevant invariants, including identity, product geometry, layout, labels, and brand details. Apply the existing creation and editing rules in `SKILL.md`.

These principles remain consistent with the [GPT Image 2 Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide); use the current guide for model-specific claims.
