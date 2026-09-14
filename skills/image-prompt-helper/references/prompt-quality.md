# Prompt Quality

Use this reference when optimizing, repairing, expanding, or judging an image prompt.

## Quality Standard

A strong prompt is a visual brief, not a bag of keywords. It should answer:

1. What is being made?
2. What must the image contain?
3. How should it be composed and rendered?
4. What must be preserved or avoided?
5. How will success be judged?

Prefer clear visual specifications over long decorative prose. Stop adding detail once the intended result and relevant constraints are clear. A prompt is ready when another person could sketch the intended image, identify the focal subject, understand the visual hierarchy, quote required text exactly, and see what must remain unchanged in an edit.

For prompts extracted from an uploaded image, also require text-only portability: the prompt must remain complete after the upload and conversation context are removed. The image may inform the analysis, but it must not remain a dependency of the generated prompt.

## Anatomy Checklist

Use only sections that materially affect the image:

- Canvas and asset type.
- Primary request.
- Scene or backdrop.
- Subject and action.
- Composition and framing.
- Style and medium.
- Materials and textures.
- Lighting and mood.
- Color palette.
- Exact text or data.
- Constraints and invariants.
- Avoid list.

## Repair Rules

- Replace generic quality words such as "masterpiece", "amazing", "epic", "best quality", and "ultra detailed" with concrete visible evidence.
- Separate content from presentation: content says what exists; presentation says how it is shown.
- Omit descriptions of details outside the frame or hidden by occlusion. If they cause a visible effect, describe that effect (such as a shadow, reflection, silhouette, fold, or interaction), not the unseen content. Keep the requested framing and occlusion rather than exposing hidden details.
- Resolve contradictions such as "minimalist" plus many props, "flat vector" plus photorealistic skin, or "no text" plus a required slogan.
- In recreation prompts extracted from images, replace references such as "the original," "the source," "as shown," "same composition," or "match the reference" with explicit descriptions of the visible feature, position, scale, viewpoint, lighting, color, or relationship.
- Avoid long negative lists. Name only likely failure modes.
- Do not ask the image model to invent important copy, labels, prices, dates, axes, or scientific data.

## Exact Text

Quote every required string exactly. Specify placement, hierarchy, color, font category, number of appearances, and whether extra text is forbidden.

Example:

```text
Render "Yours to Create." exactly once in a bold condensed sans-serif, upper-left, readable at thumbnail size. No other text.
```

For diagrams and charts, supply labels, units, legend meanings, and values. For localization, preserve layout, typography style, spacing, hierarchy, icons, logos, imagery, and visual relationships unless the user asks to redesign.

## Constraints

Use three categories:

- Must include.
- Must not include.
- Must remain unchanged.

For edits, repeat invariants explicitly: identity, body shape, pose, object placement, camera angle, crop, geometry, lighting, existing text, and background.
