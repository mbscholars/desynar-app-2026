/**
 * Static measurement profile types for UX flow.
 * Aligns with backend concepts (name, relationship/description, gender, body capture, height, weight).
 */

export const RELATIONSHIP_OPTIONS = [
  { value: "self", label: "Myself" },
  { value: "spouse", label: "Spouse" },
  { value: "sibling", label: "Sibling" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "friend", label: "Friend" },
  { value: "girlfriend", label: "Girlfriend" },
  { value: "boyfriend", label: "Boyfriend" },
  { value: "mentor", label: "Mentor" },
  { value: "other", label: "Other" },
] as const;

export type RelationshipValue = (typeof RELATIONSHIP_OPTIONS)[number]["value"];

export type GenderValue = "male" | "female";

export interface MeasurementProfileStatic {
  id: string;
  name: string;
  gender: GenderValue;
  relationship: RelationshipValue | string;
  /** Optional custom label when relationship is "other" */
  relationshipCustom?: string;
  /** Front view image URI (local or remote). Static: placeholder ok */
  frontImageUri: string | null;
  /** Side view image URI. Static: placeholder ok */
  sideImageUri: string | null;
  /** Height in cm */
  heightCm: number | null;
  /** Weight in kg */
  weightKg: number | null;
  createdAt: string;
  updatedAt: string;
}

export function getRelationshipLabel(
  value: string,
  custom?: string | null
): string {
  if (value === "other" && custom?.trim()) return custom.trim();
  const opt = RELATIONSHIP_OPTIONS.find((o) => o.value === value);
  return opt ? opt.label : value;
}
