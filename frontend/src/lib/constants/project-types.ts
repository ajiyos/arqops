/**
 * Aligned with Flyway V29 seed / `ProjectTypeDefaults`. Prefer {@link useTenantProjectTypesQuery} for UI.
 * @deprecated Use GET /api/v1/project/project-types
 */
export const PROJECT_TYPES_FALLBACK = ["Residential", "Commercial", "Interior", "Landscape"] as const;
export type ProjectTypeOption = (typeof PROJECT_TYPES_FALLBACK)[number];
