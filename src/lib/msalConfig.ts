import { PublicClientApplication, type Configuration } from '@azure/msal-browser';

export interface AzureOrg {
  id: string;
  name: string;
  clientId: string;
  tenantId: string;
}

export const AZURE_ORGS: AzureOrg[] = [
  {
    id: 'iwosan-lagoon',
    name: 'Iwosan Lagoon Hospitals',
    clientId: import.meta.env.VITE_AZURE_ORG1_CLIENT_ID as string,
    tenantId: import.meta.env.VITE_AZURE_ORG1_TENANT_ID as string,
  },
  {
    id: 'eurapharma',
    name: 'Eurapharma Care Services',
    clientId: import.meta.env.VITE_AZURE_ORG2_CLIENT_ID as string,
    tenantId: import.meta.env.VITE_AZURE_ORG2_TENANT_ID as string,
  },
  {
    id: 'iwosan-healthcare',
    name: 'Iwosan Healthcare Systems',
    clientId: import.meta.env.VITE_AZURE_ORG3_CLIENT_ID as string,
    tenantId: import.meta.env.VITE_AZURE_ORG3_TENANT_ID as string,
  },
];

// One MSAL instance per org, initialised lazily
const _instances = new Map<string, { instance: PublicClientApplication; ready: boolean }>();

export async function getMsalInstance(orgId: string): Promise<PublicClientApplication> {
  const org = AZURE_ORGS.find((o) => o.id === orgId);
  if (!org) throw new Error(`Unknown Azure org: ${orgId}`);

  let entry = _instances.get(orgId);
  if (!entry) {
    const config: Configuration = {
      auth: {
        clientId: org.clientId,
        authority: `https://login.microsoftonline.com/${org.tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
    };
    entry = { instance: new PublicClientApplication(config), ready: false };
    _instances.set(orgId, entry);
  }

  if (!entry.ready) {
    await entry.instance.initialize();
    entry.ready = true;
  }

  return entry.instance;
}
