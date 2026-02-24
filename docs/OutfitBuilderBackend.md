# Outfit Builder — Overview

The “Make Your Own Outfit” screen lets users define an outfit (model, top, bottom, shoes, optional accessories and background) and generate image(s) from the backend.

## Draft: device only

**Drafts are managed entirely on the device.** The app persists the look recipe in local storage (AsyncStorage key `outfit_builder_draft`). The backend does not receive, store, or sync drafts. Optional draft endpoints (e.g. POST/PUT `/api/v1/outfit-builder/draft`) may exist for future use but are not required for the generate flow.

## Generate outfit: backend API

The backend’s role is to **receive the outfit request payload and return generated image(s)**.

For the full API specification (request payload shape, submit endpoint, job polling, and response with `image_urls`), see:

- **[Generate Outfit — Backend API](./GenerateOutfitBackend.md)**

That document covers:

- **POST** `/api/v1/ai/outfit-generate` — request body (payload shape, sections, `color_hex`, etc.) and response (`job_id`).
- **GET** `/api/v1/ai/jobs/:job_id?type=outfit_generate` — poll until `status` is `"completed"` or `"failed"`; on success, `data.image_urls` (array of image URLs).

## App data contract (look recipe)

See `types/outfitRecipe.ts`. The in-app recipe has:

- `gender`: `"male"` | `"female"`
- `sections`: `model`, `head`, `top`, `bottom`, `shoes`, `background`
- Each section: `presets` (key/value), `prompt`, and section-specific fields (e.g. `imageRef`, `imageMode` for top; `blur`, `neutralBackground` for background).

The app builds the backend payload from this recipe via `buildOutfitGeneratePayload(recipe)` in `services/api/outfitBuilder.ts` before calling the generate API.
