import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LaunchpadFormPage from './LaunchpadFormPage';
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, name: 'Test', role: 'user' } }) }));
vi.mock('@/components/Seo', () => ({ Seo: () => null }));
vi.mock('@/components/launchpad/LaunchpadMotion', () => ({ LaunchpadReveal: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe('Implementing Your Idea form', () => {
  it('shows the six requested questions in order with a free-text duration', () => {
    const client = new QueryClient();
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter><LaunchpadFormPage /></MemoryRouter></QueryClientProvider>);
    const container = document.createElement('div');
    container.innerHTML = html;
    const section = container.querySelector('#idea-section-4')!;
    expect(section.textContent).toContain('Implementing Your Idea');
    expect(section.textContent).toContain('Test your ideas through a pilot, with clear measures of success');
    expect([...section.querySelectorAll('input,textarea')].map(input => input.getAttribute('name'))).toEqual(['implementationPlan','measurement','startDate','duration','funding','risks']);
    expect(section.querySelector('[name="duration"]')?.getAttribute('type')).not.toBe('date');
    expect(section.querySelector('label[for="funding"]')?.textContent).toContain('(The standard funding limit is N100,000 per idea)');
    expect(section.querySelector('[name="risks"]')?.hasAttribute('required')).toBe(false);
    expect(section.querySelector('[name="endDate"]')).toBeNull();
    expect(section.querySelector('[name="testTeam"]')).toBeNull();
    const approval = container.querySelector('#idea-section-5')!;
    expect([...approval.querySelectorAll(':scope > fieldset > legend')].map(item=>item.textContent?.replace(' *',''))).toEqual(['Has your line manager seen and supported this idea?', 'Has your MD approved this idea?']);
    const mdOptions = [...approval.querySelectorAll<HTMLInputElement>('input[name="mdApproved"]')];
    expect(mdOptions.map(input=>input.value)).toEqual(['yes','no']);
    expect(mdOptions.every(input=>input.required && !input.checked)).toBe(true);
    client.clear();
  });
});
