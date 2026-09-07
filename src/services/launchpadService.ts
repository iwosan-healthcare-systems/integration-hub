import { getStoredToken } from './authService';
export const LAUNCHPAD_VALUES = ['Empathetic', 'Ethical', 'Knowledge-driven', 'Innovative', 'Accessible'];
export const LAUNCHPAD_STATUSES = { submitted: 'Submitted', under_review: 'Under Review', successful: 'Successful', rejected: 'Rejected' } as const;
export type IdeaStatus = keyof typeof LAUNCHPAD_STATUSES;
export interface IdeaAnswers {
  department: string; managerName: string; managerEmail: string; problem: string; idea: string;
  values: string[]; testPlan: string; funding: number; startDate: string; endDate: string;
  measurement: string; risks: string; owner: string; managerSupported: boolean;
}
export interface IdeaSubmission {
  id: number; reference: string; userName: string; userEmail: string; userEntity: string | null;
  answers: IdeaAnswers; status: IdeaStatus; submittedAt: string; updatedAt: string; version: number;
}
export interface IdeaDetail { submission: IdeaSubmission; history: { status: IdeaStatus; changedAt: string }[] }
export interface ReviewFilters { status: string; entity: string; from: string; to: string; search: string }
export interface ReviewResult { submissions: IdeaSubmission[]; summary: Record<IdeaStatus, number>; total: number; page: number; pageSize: number }
const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
async function request(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const response = await fetch(`${base}/api/launchpad${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || 'Request failed. Please try again.'); }
  return response;
}
export async function submitIdea(answers: IdeaAnswers): Promise<{ submission: IdeaSubmission }> { return (await request('/submissions', { method: 'POST', body: JSON.stringify({ answers }) })).json(); }
export async function getMyIdeas(): Promise<{ submissions: IdeaSubmission[] }> { return (await request('/submissions/mine')).json(); }
export async function getIdea(id: number): Promise<IdeaDetail> { return (await request(`/submissions/${id}`)).json(); }
const query = (filters: ReviewFilters) => new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
export async function getReview(filters: ReviewFilters, page: number): Promise<ReviewResult> { return (await request(`/review?${query(filters)}&page=${page}`)).json(); }
export async function changeIdeaStatus(id: number, status: IdeaStatus, version: number) { return (await request(`/submissions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, version }) })).json(); }
export async function exportIdeas(filters: ReviewFilters) {
  const blob = await (await request(`/review/export?${query(filters)}`)).blob();
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'launchpad-responses.csv'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
