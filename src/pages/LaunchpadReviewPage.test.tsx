import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LaunchpadReviewPage from './LaunchpadReviewPage';
import { getReview } from '@/services/launchpadService';

let account = { id: 1, role: 'user', canReviewLaunchpad: false };
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: account }) }));
vi.mock('@/components/Seo', () => ({ Seo: () => null }));
vi.mock('@/services/launchpadService', async (original) => ({
  ...await original<typeof import('@/services/launchpadService')>(),
  getReview: vi.fn(),
}));

async function show(path: string) {
  await act(async () => {
    root.render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/launchpad/review" element={<LaunchpadReviewPage />} />
      <Route path="/admin/launchpad" element={<div data-testid="panel-layout"><LaunchpadReviewPage panel /></div>} />
      <Route path="/launchpad" element={<h1>LaunchPad overview</h1>} />
    </Routes></MemoryRouter></QueryClientProvider>);
  });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(getReview).mockReset().mockResolvedValue({ submissions: [], summary: { submitted: 0, under_review: 0, successful: 0, rejected: 0 }, total: 0, page: 1, pageSize: 25 });
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); container.remove(); vi.unstubAllGlobals(); });

const navigation = () => container.querySelector('nav[aria-label="LaunchPad navigation"]');
const panel = () => container.querySelector('[data-testid="panel-layout"]');

describe('LaunchPad review location and access', () => {
  for (const role of ['admin', 'manager']) {
    it(`${role} stays inside the panel and retains dashboard controls`, async () => {
      account = { id: 1, role, canReviewLaunchpad: false };
      await show('/admin/launchpad');
      expect(panel()).not.toBeNull();
      expect(container.textContent).toContain('Export CSV');
      expect(container.textContent).toContain('Apply filters');
      expect(getReview).toHaveBeenCalled();
      expect(navigation()).toBeNull();
      expect(container.querySelector('a[href="/launchpad"]')).toBeNull();
    });
    it(`redirects ${role} from a hub review link into the panel`, async () => {
      account = { id: 1, role, canReviewLaunchpad: true };
      await show('/launchpad/review');
      expect(panel()).not.toBeNull();
      expect(navigation()).toBeNull();
    });
  }
  it('keeps permitted regular users on the hub dashboard', async () => {
    account = { id: 1, role: 'user', canReviewLaunchpad: true };
    await show('/launchpad/review');
    expect(navigation()).not.toBeNull();
    expect(panel()).toBeNull();
    expect(getReview).toHaveBeenCalled();
  });
  it('denies hub dashboard access without reviewer permission', async () => {
    account = { id: 1, role: 'user', canReviewLaunchpad: false };
    await show('/launchpad/review');
    expect(container.textContent).toBe('LaunchPad overview');
    expect(getReview).not.toHaveBeenCalled();
  });
  it('does not render the panel dashboard for a regular reviewer', async () => {
    account = { id: 1, role: 'user', canReviewLaunchpad: true };
    await show('/admin/launchpad');
    expect(container.textContent).toBe('LaunchPad overview');
    expect(getReview).not.toHaveBeenCalled();
  });
});
