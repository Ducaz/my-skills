# Prompt Patterns

Use this reference to choose the output format and prompt structure.

## Natural-Language Creation

Use for coherent scenes where atmosphere, action, and storytelling matter more than many independent constraints.

Order:

```text
Deliverable and scene -> subject and action -> composition -> art direction ->
lighting and mood -> exact text -> constraints
```

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

When the user only supplies an image, write a prompt that recreates visible features:

```text
Create an image closely matching the reference: [asset type and main subject].

Describe the visible subject, pose/action, environment, composition, viewpoint, crop, depth, lighting, color palette, materials, textures, style, and mood.

Constraints: preserve the visible composition and key design relationships; avoid adding extra objects, text, logos, or changing the visual genre unless present in the reference.
```

If the image includes identifiable people, brands, copyrighted characters, or living-artist style, avoid instructing exact public imitation. Describe observable, transferable visual traits.
