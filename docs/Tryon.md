# Virtual Try-On API – Frontend Integration

FASHN v1.6 virtual try-on: submit model + garment images, get a `request_id`, then poll until completed. All responses include stored image URLs (backend proxies FAL and persists the images).

**Base URL:** `EXPO_PUBLIC_API_BASE_URL` (no trailing slash). Paths use prefix `v1`. Example: `https://api.yourdomain.com` → `https://api.yourdomain.com/v1/ai/virtual-try-on`.

**Auth:** All endpoints require **Sanctum** (e.g. `Authorization: Bearer <token>`).

---

## 1. Submit try-on

**POST** `/v1/ai/virtual-try-on`

Starts a try-on job. Returns immediately with a `request_id`; the frontend uses this for polling.

### Request body

| Field                | Type    | Required | Description                                                                  |
| -------------------- | ------- | -------- | ---------------------------------------------------------------------------- |
| `model_image`        | string  | Yes      | URL or base64 data URI of the **person** (model) image                       |
| `garment_image`      | string  | Yes      | URL or base64 data URI of the **garment** (clothing) image                   |
| `category`           | string  | No       | `tops` \| `bottoms` \| `one-pieces` \| `auto` (default: `auto`)              |
| `mode`               | string  | No       | `performance` \| `balanced` \| `quality` (default: `balanced`)               |
| `garment_photo_type` | string  | No       | `auto` \| `model` \| `flat-lay` (default: `auto`)                            |
| `moderation_level`   | string  | No       | `none` \| `permissive` \| `conservative` (default: `permissive`)              |
| `num_samples`        | integer | No       | 1–4 (default: 1)                                                             |
| `segmentation_free`  | boolean | No       | Default: `true`                                                              |
| `output_format`      | string  | No       | `png` \| `jpeg` (default: `png`)                                             |
| `seed`               | integer | No       | For reproducible results                                                    |

### Success response (202 Accepted)

```json
{
  "success": true,
  "data": {
    "request_id": "024ca5b1-45d3-4afd-883e-ad3abe2a1c4d"
  }
}
```

### Error responses (400)

- Validation or FAL submit error: `{ "success": false, "error": { "code": "VALIDATION_ERROR" | "FAL_SUBMIT_FAILED", "message": "..." } }`.

---

## 2. Poll status / get result

**GET** `/v1/ai/jobs/{request_id}?type=virtual_tryon`

Use the `request_id` from step 1. Poll every 3–5 seconds until `data.status` is `completed` or `failed`.

### Success response (200 OK)

- **Processing:** `{ "success": true, "data": { "status": "processing" } }`
- **Completed:** `{ "success": true, "data": { "status": "completed", "image_urls": ["https://..."] } }`
- **Failed:** `{ "success": true, "data": { "status": "failed", "error": "..." } }`

### 404 – Job not found

`{ "success": false, "error": { "code": "JOB_NOT_FOUND", "message": "..." } }`

---

## 3. Frontend flow (service: `services/api/tryon.ts`)

1. **Submit:** `POST /v1/ai/virtual-try-on` with `model_image`, `garment_image`, and options. Expect **202** and `data.request_id`.
2. **Poll:** `GET /v1/ai/jobs/{request_id}?type=virtual_tryon` with the same auth. Poll every **5 seconds** until `data.status` is `completed` or `failed`. Timeout after 60 polls (~5 minutes).
3. **Result:** If `completed`, use `data.image_urls` (stored URLs). If `failed`, show `data.error`.

### Exports

| Export                 | Description |
| ---------------------- | ----------- |
| `tryOnGenerate(input, onProgress?)` | Submit job, poll until done; optional progress (IN_PROGRESS → IN_QUEUE → COMPLETED/FAILED). |
| `tryOnGenerateSync(input)`         | Same as `tryOnGenerate` (no progress callback). |
| `TryOnGenerateInput`   | Input type: `model_image`, `garment_image`, plus optional fields. `measurement_profile_id` / `product_id` are app-only (not sent). |
| `TryOnGenerateResponse`| `{ success, data?: { images }, error? }`. |
| `TryOnQueueUpdate`     | Progress: `status` (IN_QUEUE \| IN_PROGRESS \| COMPLETED \| FAILED), optional `logs`. |

### Usage (e.g. review screen)

- Model image: measurement profile’s `frontImageUri`.
- Garment image: current display image (product or accepted customized image).
- Call `tryOnGenerate({ model_image, garment_image, category: "auto", mode: "balanced", num_samples: 1 }, (update) => setTryOnProgress(...))`.
- On success, show `result.data.images`; user can accept and set `acceptedCustomizedImageUrl` / `product.imageUri`.

### Error handling

- All errors surface as `TryOnGenerateResponse` with `success: false` and `error` string, or thrown `ApiError`. UI should show message and allow retry.
