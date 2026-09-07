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
  vi.mocked(getReview).mockReset().mockResolvedValue({ submissions: [], summary: { submitted: 0, under_review: 0, successful: 0, rejected: 0 }, statusSummary: { submitted: 0, under_review: 0, successful: 0, rejected: 0 }, entitySummary: [], total: 0, page: 1, pageSize: 25 });
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


it('status cards toggle the filter, reset pagination, and clear to all submissions', async () => {
  account = { id: 1, role: 'manager', canReviewLaunchpad: false };
  await show('/admin/launchpad');
  // Flush the query observer notification before interacting with loaded cards.
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  const card = (label: string) => [...container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find(button => button.textContent?.includes(label))!;
  expect(container.querySelector('#review-status')).toBeNull();
  expect(card('Submitted')).toBeDefined();
  await act(async () => { card('Submitted').click(); });
  expect(getReview).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'submitted' }), 1);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(card('Submitted').getAttribute('aria-pressed')).toBe('true');
  await act(async () => { card('Submitted').click(); });
  expect(card('All submissions').getAttribute('aria-pressed')).toBe('true');
  await act(async () => { card('Under Review').click(); });
  expect(getReview).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'under_review' }), 1);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  await act(async () => { card('All submissions').click(); });
  expect(card('All submissions').getAttribute('aria-pressed')).toBe('true');
});

it('orders cards before charts and filters, with independent chart switches', async () => {
  account = { id: 1, role: 'manager', canReviewLaunchpad: false };
  await show('/admin/launchpad');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  const cards = container.querySelector('[aria-label="Filter submissions by status"]')!;
  const status = container.querySelector('[aria-label="Ideas by status chart type"]')!;
  const entity = container.querySelector('[aria-label="Ideas by entity chart type"]')!;
  const form = container.querySelector('form')!;
  expect(cards.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(entity.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const button = (group: Element, type: string) => group.querySelector<HTMLButtonElement>(`[aria-label="${type} chart"]`)!;
  expect(button(status, 'Bar').getAttribute('aria-pressed')).toBe('true');
  expect(button(entity, 'Pie').getAttribute('aria-pressed')).toBe('true');
  await act(async () => { button(status, 'Pie').click(); });
  expect(button(status, 'Pie').getAttribute('aria-pressed')).toBe('true');
  expect(button(entity, 'Pie').getAttribute('aria-pressed')).toBe('true');
  await act(async () => { button(entity, 'Bar').click(); });
  expect(button(entity, 'Bar').getAttribute('aria-pressed')).toBe('true');
  expect(button(status, 'Pie').getAttribute('aria-pressed')).toBe('true');
});

describe('status reversal controls', () => {
  for (const role of ['manager', 'user', 'admin']) {
    for (const status of ['under_review', 'successful', 'rejected'] as const) {
      it(`${role} has the correct controls for ${status}`, async () => {
        account = { id: 1, role, canReviewLaunchpad: true };
        const result = await vi.mocked(getReview)({ status: '', entity: '', from: '', to: '', search: '' }, 1);
        vi.mocked(getReview).mockResolvedValue({
          ...result,
          submissions: [{
            id: 1, reference: 'IHS-000001', userName: 'Reviewer test', userEmail: 'test@example.com',
            userEntity: null, status, version: 1, submittedAt: '2026-09-07T10:00:00Z', updatedAt: '2026-09-07T10:00:00Z',
            answers: { department: 'IT', managerName: '', managerEmail: '', problem: '', idea: 'Test idea', values: [], testPlan: '', funding: 0, startDate: '', endDate: '', measurement: '', risks: '', owner: '', managerSupported: true },
          }],
        });
        await show(role === 'user' ? '/launchpad/review' : '/admin/launchpad');
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
        const select = container.querySelector<HTMLSelectElement>('[aria-label="Status for IHS-000001"]')!;
        const option = (value: string) => select.querySelector<HTMLOptionElement>(`option[value="${value}"]`)!;
        expect(option('submitted').disabled).toBe(role !== 'admin');
        expect(select.disabled).toBe(role !== 'admin' && status !== 'under_review');
        if (role === 'admin') {
          expect([...select.options].every(item => !item.disabled)).toBe(true);
        } else if (status === 'under_review') {
          expect(option('successful').disabled).toBe(false);
          expect(option('rejected').disabled).toBe(false);
        }
      });
    }
  }
});
