// Real organisations a user can belong to. Mirrors the ENTITIES map in
// server.js — the 3 with Azure SSO reuse their AZURE_ORGS key
// (see msalConfig.ts) as the entity value, so a user's entity is set directly
// from the org they authenticate through. Paelon Memorial has no Azure app
// registration yet, so its users are local accounts with entity assigned
// manually in the admin Users page.
export interface Entity {
  id: string;
  name: string;
}

export const ENTITIES: Entity[] = [
  { id: 'iwosan-wellness', name: 'Iwosan Wellness' },
  { id: 'iwosan-lagoon', name: 'Lagoon Hospitals' },
  { id: 'euracare', name: 'Euracare' },
  { id: 'paelon-memorial', name: 'Paelon Memorial' },
  { id: 'iwosan-healthcare', name: 'Iwosan Healthcare Systems' },
];

// Visibility-only marker for CMS content. This is not a user organisation.
export const GENERAL_ENTITY = 'general';

export const VISIBILITY_ENTITIES: Entity[] = [
  { id: GENERAL_ENTITY, name: 'General' },
  ...ENTITIES,
];

export function entityName(id: string | null | undefined): string {
  return VISIBILITY_ENTITIES.find((e) => e.id === id)?.name ?? "Unassigned";
}
