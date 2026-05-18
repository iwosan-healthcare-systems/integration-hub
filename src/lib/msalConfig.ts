import { PublicClientApplication, type Configuration } from '@azure/msal-browser';

export const AZURE_ORG = {
  id: 'iwosan-lagoon',
  name: 'Iwosan Lagoon Hospitals',
  clientId: import.meta.env.VITE_AZURE_CLIENT_ID as string,
  tenantId: import.meta.env.VITE_AZURE_TENANT_ID as string,
};

let _instance: { instance: PublicClientApplication; ready: boolean } | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (!_instance) {
    const config: Configuration = {
      auth: {
        clientId: AZURE_ORG.clientId,
        authority: `https://login.microsoftonline.com/${AZURE_ORG.tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
    };
    _instance = { instance: new PublicClientApplication(config), ready: false };
  }

  if (!_instance.ready) {
    await _instance.instance.initialize();
    _instance.ready = true;
  }

  return _instance.instance;
}
