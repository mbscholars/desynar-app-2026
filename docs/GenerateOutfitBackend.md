# Generate Outfit — Backend API

This document describes the backend API for **generating an outfit image** from the app’s “Make Your Own Outfit” flow.

**Context:**
- **Drafts are managed on the device only.** The app stores the look recipe in local storage (AsyncStorage). The backend does not receive or store drafts.
- **Backend responsibility:** Accept a single request payload describing the outfit and return one or more generated image URLs (typically two).

---

## Overview

1. **POST** `/api/v1/ai/outfit-generate` — Client sends the outfit payload; backend returns a `job_id`.
2. **GET** `/api/v1/ai/jobs/:job_id?type=outfit_generate` — Client polls until the job is done; backend returns `status` and, when completed, `image_urls`.

**Auth:** Bearer token (required).

---

## 1. Submit generation

**POST** `/api/v1/ai/outfit-generate`

**Request body:** JSON payload describing the outfit. All keys are **camelCase** except the top-level **`body_model_id`** (snake_case).

### Request payload shape

```json
{
  "gender": "male",
  "body_model_id": "optional-string-or-null",
  "sections": {
    "model": {
      "presets": { "type": "regular", "complexion": "medium" },
      "prompt": "",
      "measurementProfileId": null,
      "imageRef": null
    },
    "head": {
      "presets": { "hat": "none", "glasses": "none", "makeup": "natural", "jewelry": "none" },
      "prompt": "",
      "imageRef": null
    },
    "top": {
      "presets": {
        "type": "t-shirt",
        "fit": "regular",
        "fabric": "cotton",
        "sleeve": "long",
        "color": "navy",
        "color_hex": "#1e3a5f"
      },
      "prompt": "",
      "imageRef": null,
      "imageMode": "style_only"
    },
    "bottom": {
      "presets": {
        "type": "trousers",
        "fit": "regular",
        "waist": "mid",
        "fabric": "cotton",
        "color": "black",
        "color_hex": "#1C1C1E"
      },
      "prompt": "",
      "imageRef": null
    },
    "shoes": {
      "presets": {
        "type": "sneakers",
        "color": "white",
        "material": "leather",
        "detail": "minimal",
        "color_hex": "#F5F5F5"
      },
      "prompt": ""
    },
    "background": {
      "presets": { "scene": "studio white", "lighting": "soft daylight", "tone": "neutral" },
      "prompt": "",
      "blur": 40,
      "neutralBackground": true
    }
  }
}
```

### Section reference

| Section      | Purpose | Presets / fields |
|-------------|---------|-------------------|
| **model**   | Body type and complexion | `presets.type` (e.g. `"regular"`, `"slim"`), `presets.complexion` (e.g. `"medium"`, `"dark"`). Optional `measurementProfileId`, `imageRef` for try-on. |
| **head**    | Accessories | `presets`: `hat`, `glasses`, `makeup`, `jewelry`. `imageRef` (reference image URL or null). |
| **top**     | Upper body garment | `presets`: `type`, `fit`, `fabric`, `sleeve`, `color`, **`color_hex`**. `prompt`, `imageRef`, `imageMode` (`"style_only"` \| `"full"`). |
| **bottom**  | Lower body garment | `presets`: `type`, `fit`, `waist`, `fabric`, `color`, **`color_hex`**. `prompt`, `imageRef`. |
| **shoes**   | Footwear | `presets`: `type`, `color`, `material`, `detail`, **`color_hex`**. `prompt`. |
| **background** | Scene | `presets`: `scene`, `lighting`, `tone`. `blur`, `neutralBackground`. |

### Backend implementation notes

- **Colors:** Use **`presets.color_hex`** when present (e.g. `"#1e3a5f"`) for accurate rendering. `presets.color` may be a name (e.g. `"navy"`) or a custom hex from the app’s color wheel.
- **Top `imageMode`:** `"style_only"` means use the reference image for style only and ignore its color; `"full"` means use style and color.
- **`imageRef`:** When non-null, the app may send a local URI or uploaded URL; backend should resolve and use it for reference/try-on where applicable.

### Response (202 or 200)

```json
{
  "success": true,
  "data": {
    "job_id": "uuid-or-opaque-id",
    "preview_image_url": "https://optional-preview-url/..."
  }
}
```

On failure:

```json
{
  "success": false,
  "error": "Human-readable message"
}
```

---

## 2. Poll for result

**GET** `/api/v1/ai/jobs/:job_id?type=outfit_generate`

**Query:** `type=outfit_generate` is sent so the backend can route to the correct job type.

### Response while processing

```json
{
  "success": true,
  "data": {
    "status": "processing",
    "preview_image_url": "https://optional-preview/..."
  }
}
```

### Response when completed

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "image_urls": [
      "https://cdn.example.com/outfit-1.png",
      "https://cdn.example.com/outfit-2.png"
    ]
  }
}
```

- **`image_urls`:** Array of one or more image URLs. The app typically displays up to two images on the result screen. Backend should return the generated outfit image(s) here.

### Response when failed

```json
{
  "success": true,
  "data": {
    "status": "failed",
    "error": "Human-readable reason"
  }
}
```

### Client behavior

- The app polls this endpoint periodically until `status` is `"completed"` or `"failed"`.
- On **completed**, the app navigates to the result screen and shows `data.image_urls` (e.g. two images) with options such as “Add to catalog” and “Done”.
- On **failed**, the app shows an error to the user.

---

## 3. Create product from outfit (Add to catalog)

**POST** `/api/v1/ai/create-product-from-outfit`

**Auth:** Bearer (Sanctum) required.

**Request body:**

| Field   | Type   | Required | Description |
|--------|--------|----------|-------------|
| job_id | string | Yes      | UUID of a completed `outfit_generate` job (from submit + poll). |

**Behavior (backend):** Ensures the job exists and belongs to the authenticated user (`outfit_image_job_user` cache), job status is `completed`, then creates a product via `OutfitProductCreationService` with title like "Generated Outfit – Feb 22, 2025 at 2:30 PM", description from prompt, status `draft`, tags `ai-generated`, `outfit-generator`, `app-outfit`, and customizations for reference.

**Success (201):**

```json
{
  "success": true,
  "message": "Product created from generated outfit",
  "data": {
    "product_id": 123,
    "name": "Generated Outfit – Feb 22, 2025 at 2:30 PM"
  }
}
```

**Errors:**

- **404** — Job not found or not owned by user (`JOB_NOT_FOUND`).
- **400** — Job not completed yet (`JOB_NOT_COMPLETED`), no images (`NO_IMAGES`), or product creation failed (`PRODUCT_CREATION_FAILED`).

**App flow:** After the user sees the result screen (with `image_urls`), tapping “Add to catalog” calls this endpoint with the same `job_id`. On success, the app shows the product name and offers “Done” or “View catalog”.

---

## Summary

| Item | Detail |
|------|--------|
| **Draft** | Not sent to backend; managed on the device only. |
| **Generate** | POST outfit payload → `job_id`; GET job status → `image_urls` when completed. |
| **Add to catalog** | POST `job_id` to `/api/v1/ai/create-product-from-outfit` → product created as draft. |
| **Response** | Submit returns `job_id`; poll returns `status` and `image_urls`; create-product returns `product_id` and `name`. |

Payload is built in the app by `buildOutfitGeneratePayload(recipe)` in `services/api/outfitBuilder.ts`. Create-product is called by `createProductFromOutfitGenerate(jobId)` in the same file.
