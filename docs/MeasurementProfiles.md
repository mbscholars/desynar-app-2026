# Measurement profile management

## Overview

Luxury-focused measurement profile flow: list profiles, create (name, gender, relationship, front/side photos, height/weight), edit, and delete. Uses **static data** persisted in AsyncStorage for UX; backend API integration can replace the context store later.

## Entry point

- **Plus tab → Manage measurements** opens the measurements modal (stack).
- Route: `/measurements` (modal presentation).

## Screens

| Screen        | Route                     | Purpose                          |
| ------------- | ------------------------- | --------------------------------- |
| List          | `/measurements`           | List profiles, add, delete, edit  |
| Create        | `/measurements/create`   | Multi-step create wizard          |
| Edit          | `/measurements/[id]/edit`| Edit existing profile             |

## Create flow (3 steps)

1. **Profile details**: Name, Gender (Male/Female), Relationship (dropdown: Myself, Spouse, Sibling, etc. + Other with custom).
2. **Body reference**: Sample placeholders for front/side view; tap to “add” front/side photo (placeholder URI for now). Height (cm) and Weight (kg) inputs.
3. **Review & save**: Summary card and “Save profile” → persists to context and navigates back to list.

## List

- Atelier panel cards: avatar (gender icon), name, relationship · gender, updated date, height · weight (if set).
- Delete: trash icon → confirmation alert.
- Tap card → edit screen.

## Edit

- Same fields as create (single scrollable form). Save updates profile and goes back.

## Data

- **Context**: `MeasurementProfilesContext` (provider in root layout). Persists to AsyncStorage key `desynar_measurement_profiles_static`.
- **Types**: `@/types/measurement` — `MeasurementProfileStatic`, `RELATIONSHIP_OPTIONS`, `GenderValue`, `getRelationshipLabel()`.

## Theme

- Atelier tokens throughout: `atelier.background`, `atelier.panel`, `atelier.panelBorder`, `atelier.cta`, `atelier.muted`, `atelier.accent`, `atelier.divider`. No hardcoded colors.

## Backend alignment

Flow and fields align with desynar backend: `GET/POST /api/v1/measurement-profiles`, body capture (front/side, gender, body type), and measurements (height, weight). Static implementation can be swapped for `measurementProfilesApi` and measurement APIs when ready.
