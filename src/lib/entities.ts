// Entities that CMS content (e.g. Sessions) can be scoped to. Mirrors the
// ENTITIES map in server.js — the 3 with Azure SSO reuse their AZURE_ORGS
// key (see msalConfig.ts) as the entity value, so a user's entity is set
// directly from the org they authenticate through. Paelon Memorial has no
// Azure app registration yet, so its users are local accounts with entity
// assigned manually in the admin Users page.
export interface Entity {
  id: string;
  name: string;
}

export const ENTITIES: Entity[] = [
  { id: 'iwosan-lagoon', name: 'Lagoon Hospitals' },
  { id: 'euracare', name: 'Euracare' },
  { id: 'paelon-memorial', name: 'Paelon Memorial' },
  { id: 'iwosan-healthcare', name: 'Iwosan Healthcare Systems' },
];

// Content tagged to this entity is visible to every entity, not just
// Iwosan Healthcare's own users.
export const GENERAL_ENTITY = 'iwosan-healthcare';

export function entityName(id: string | null | undefined): string {
  return ENTITIES.find((e) => e.id === id)?.name ?? "Unassigned";
}
