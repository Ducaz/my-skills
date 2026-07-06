# OpenAI Image Prompting Guidance

This reference summarizes current OpenAI guidance reviewed while creating this skill. Treat official OpenAI documentation as the primary authority when a user asks about OpenAI-specific model behavior or parameters.

Sources:

- OpenAI API image generation guide: https://developers.openai.com/api/docs/guides/image-generation
- OpenAI Cookbook GPT Image Generation Models Prompting Guide, Apr 21, 2026: https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide

## Prompting Fundamentals

OpenAI's image prompting guide emphasizes:

- Write prompts in a consistent order, such as background/scene -> subject -> key details -> constraints.
- Include the intended use, such as ad, UI mockup, infographic, or production asset, to set the expected polish and mode.
- Use short labeled segments or line breaks for complex requests.
- Use whichever format is easiest to maintain: natural paragraph, minimal prompt, JSON-like structure, instruction-style prompt, or tag-based prompt, as long as intent and constraints are clear.
- Be concrete about materials, shapes, textures, visual medium, and targeted quality cues.
- Say "photorealistic" directly when photorealism is required.
- Use camera terms for broad look, framing, and composition rather than exact physical simulation.

## Fidelity And Quality

OpenAI notes that latency and fidelity trade off by workflow. For latency-sensitive or high-volume use, lower quality can be enough. For small text, dense infographics, close-up portraits, identity-sensitive edits, or high-resolution outputs, compare medium or high quality before shipping.

Do not bake volatile API parameters into a prompt unless the user asks for execution guidance. Keep model, size, quality, format, masks, and transparency workflow separate from visual prompt prose.

## Text And Structured Images

For infographics, diagrams, ads, UI, and text-heavy images:

- Provide the exact text.
- Define audience and purpose.
- Specify layout regions, hierarchy, and readability.
- Preserve layout and typography when localizing or editing existing designs.
- Avoid asking the model to invent factual labels or data.

## Edits And Reference Images

For edits, define what changes and what stays fixed. Preserve layout, typography style, placement, spacing, hierarchy, icons, logos, imagery, and visual relationships when translating or modifying an existing design unless the user requests a redesign.

For identity-sensitive or character-consistent work, explicitly preserve recognizable features and proportions.
