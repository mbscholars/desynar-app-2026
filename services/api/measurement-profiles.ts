import type { MeasurementProfileStatic } from "@/types/measurement";
import { api, request } from "./client";
import type {
  MeasurementProfileListItem,
  MeasurementProfilesResponse,
} from "./types";

const BASE = "/api/v1/measurement-profiles";

/** Map API profile (GET list) to display shape used by list and edit. */
export function mapApiProfileToStatic(
  item: MeasurementProfileListItem,
): MeasurementProfileStatic {
  const measurements = item.user_measurements ?? [];
  const byName = (name: string) =>
    measurements.find((m) => m.name?.toLowerCase() === name.toLowerCase())
      ?.value;

  const heightVal = byName("height");
  const weightVal = byName("weight");
  const genderVal = byName("gender");

  return {
    id: String(item.id),
    name: item.name,
    gender:
      genderVal === "female" || genderVal === "male"
        ? (genderVal as "male" | "female")
        : "male",
    relationship: item.description ?? "other",
    frontImageUri: byName("front_view") ?? null,
    sideImageUri: byName("side_view") ?? null,
    heightCm:
      heightVal != null && heightVal !== "" ? parseFloat(heightVal) : null,
    weightKg:
      weightVal != null && weightVal !== "" ? parseFloat(weightVal) : null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export interface CreateFromCapturePayload {
  name: string;
  gender: "male" | "female";
  frontViewUri: string;
  sideViewUri: string;
  height?: number | null;
  weight?: number | null;
}

export interface CreateFromCaptureResponse {
  success?: boolean;
  data?: MeasurementProfileListItem;
  message?: string;
}

/**
 * Create a measurement profile from body capture (front/side images + optional height/weight).
 * POST /api/v1/measurement-profiles/from-capture (multipart/form-data). Requires auth.
 */
export async function createFromCapture(
  payload: CreateFromCapturePayload,
): Promise<CreateFromCaptureResponse> {
  const formData = new FormData();
  formData.append("name", payload.name.trim());
  formData.append("gender", payload.gender);
  // React Native FormData: { uri, name, type } is sent as multipart file (front_view/side_view).
  formData.append("front_view", {
    uri: payload.frontViewUri,
    name: "front.jpg",
    type: "image/jpeg",
  } as unknown as Blob);
  formData.append("side_view", {
    uri: payload.sideViewUri,
    name: "side.jpg",
    type: "image/jpeg",
  } as unknown as Blob);
  if (payload.height != null && Number.isFinite(payload.height)) {
    formData.append("height", String(payload.height));
  }
  if (payload.weight != null && Number.isFinite(payload.weight)) {
    formData.append("weight", String(payload.weight));
  }
  return request<CreateFromCaptureResponse>("POST", `${BASE}/from-capture`, {
    formData,
    requiresAuth: true,
  });
}

/**
 * Delete a measurement profile by ID.
 * DELETE /api/v1/measurement-profiles/:id. Requires auth.
 */
export async function deleteProfile(
  profileId: number,
): Promise<{ message?: string }> {
  return api.delete<{ message?: string }>(`${BASE}/${profileId}`, {
    requiresAuth: true,
  });
}

export const measurementProfilesApi = {
  /** List measurement profiles for current user. Requires auth. */
  getList: () => api.get<MeasurementProfilesResponse>(BASE),
  createFromCapture,
  deleteProfile,
};
