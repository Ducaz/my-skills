# Prompt Patterns

Use this reference to choose the output format and prompt structure.

## Natural-Language Creation

Use for coherent scenes where atmosphere, action, and storytelling matter more than many independent constraints.

Typical shape:

```text
Create a [asset type / medium] of [primary subject and scene].

Frame [subject/action/composition], with [visible details and relationships].

Use [style/medium], [materials/textures], [lighting], [palette], and [mood].

Include [exact text if any]. Avoid [likely failure modes].
```

## Structured Creation

Use for ads, posters, infographics, UI, diagrams, logos, multi-panel scenes, product images, and templates.

```text
Asset type:
Canvas:
Intended use:
Primary request:
Scene:
Subject:
Composition:
Style / medium:
Materials:
Lighting:
Palette:
Exact text:
Constraints:
Avoid:
```

## Hybrid Prompt

Use a short natural brief followed by labeled controls when the user wants a polished prompt but precision matters.

```text
Create [brief visual goal].

Composition: ...
Style: ...
Lighting: ...
Exact text: ...
Constraints: ...
```

## Editing Prompt

Use for changing an input image. Make the requested difference narrow and testable.

```text
Change:
- ...

Preserve:
- ...

Integrate:
- ...

Avoid:
- ...
```

Integration should mention perspective, scale, lighting direction, shadows, reflections, occlusion, edge quality, texture, depth of field, color temperature, and image sharpness when relevant.

## Reference-Guided Creation

Label references by role:

```text
Image 1: Character appearance reference
Image 2: Palette and texture reference

Create a new scene using [specific attributes] from Image 1 and [specific attributes] from Image 2. Do not copy either reference's composition unless requested.
```

## Reference-Only Recreation

Apply [Recreation Prompt Rules](../SKILL.md#recreation-prompt-rules). Template:

```text
Create [asset type and main subject, stated directly].

Subject: [appearance, count, pose/action, expression, clothing, and distinctive visible features].
Scene: [environment, background, props, object placement, and spatial relationships].
Composition: [viewpoint, camera angle, framing, crop, focal hierarchy, depth, and negative space].
Rendering: [medium/style, lighting direction and quality, shadows, palette, materials, textures, and mood].
Text: [all readable text quoted exactly, with placement and typography; otherwise say no text].
Constraints: [concrete elements to include or exclude].
```

Example rewrites:

- "Keep the same camera angle" -> "Three-quarter view from slightly below eye level."
- "Preserve the layout" -> "The headline spans the upper third; a centered bottle fills the lower half, with equal side margins."
