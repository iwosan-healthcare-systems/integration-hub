import { PublicClientApplication, type Configuration } from '@azure/msal-browser';
import lagoonLogo from '@/assets/iwosan_logo.webp';
import healthcareIcon from '@/assets/iwosan_icon.webp';
import euracareIcon from '@/assets/logos/euracare-logo.svg';

export interface AzureOrg {
  id: string;
  name: string;
  clientId: string;
  tenantId: string;
  logo: string;
}

export const AZURE_ORGS: AzureOrg[] = [
  {
    id: 'iwosan-lagoon',
    name: 'Lagoon Hospitals',
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
    tenantId: import.meta.env.VITE_AZURE_TENANT_ID as string,
    logo: lagoonLogo,
  },
  {
    id: 'iwosan-healthcare',
    name: 'Iwosan Healthcare',
    clientId: import.meta.env.VITE_AZURE_HEALTHCARE_CLIENT_ID as string,
    tenantId: import.meta.env.VITE_AZURE_HEALTHCARE_TENANT_ID as string,
    logo: healthcareIcon,
  },
  {
    id: 'euracare',
    name: 'Euracare',
    clientId: import.meta.env.VITE_AZURE_EURACARE_CLIENT_ID as string,
    tenantId: import.meta.env.VITE_AZURE_EURACARE_TENANT_ID as string,
    logo: euracareIcon,
  },
];

const _instances = new Map<string, { instance: PublicClientApplication; ready: boolean }>();

export async function getMsalInstance(orgId: string): Promise<PublicClientApplication> {
  const org = AZURE_ORGS.find((o) => o.id === orgId);
  if (!org) throw new Error(`Unknown Azure org: ${orgId}`);

  if (!_instances.has(orgId)) {
    const config: Configuration = {
      auth: {
        clientId: org.clientId,
        authority: `https://login.microsoftonline.com/${org.tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
    };
    _instances.set(orgId, { instance: new PublicClientApplication(config), ready: false });
  }

  const entry = _instances.get(orgId)!;
  if (!entry.ready) {
    await entry.instance.initialize();
    // Clear any stale interaction state left in sessionStorage from a previous
    // page load — without this, the first loginPopup() call throws
    // interaction_in_progress and the user has to click a second time.
    await entry.instance.handleRedirectPromise().catch(() => {});
    entry.ready = true;
  }

  return entry.instance;
}

export async function clearAllMsalCaches(): Promise<void> {
  for (const [, entry] of _instances) {
    if (entry.ready) {
      try { await entry.instance.clearCache(); } catch { /* ignore */ }
    }
  }
}
