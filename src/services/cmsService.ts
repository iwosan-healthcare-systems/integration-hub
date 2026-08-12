import { getStoredToken } from './authService';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  let res: Response;
  try {
    const token = getStoredToken();
    res = await fetch(`${API_BASE}/api${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      ...options,
    });
  } catch (err) {
    console.error(`apiFetch: network error for ${path}`, err);
    return { data: null, error: 'Network error. Please try again.' };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch (err) {
    console.error(`apiFetch: failed to parse response for ${path} (status ${res.status})`, err);
  }

  if (!res.ok) {
    return { data: null, error: json?.error || `Request failed (${res.status})` };
  }
  return { data: json as T, error: null };
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  featured: boolean;
  image: string;
  images: string[];
  url: string;
  sortOrder: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: 'Onboarding' | 'Clinical' | 'Compliance' | 'IT & Digital' | 'Leadership' | 'Soft Skills';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  audience: string;
  modules: number;
  mandatory: boolean;
  courseUrl: string;
  sortOrder: number;
}

export interface LearningPath {
  id: number;
  title: string;
  description: string;
  audience: string;
  courseIds: string[];
  totalDuration: string;
  icon: string;
  sortOrder: number;
}

export interface LiveSession {
  id: number;
  title: string;
  date: string;
  time: string;
  format: 'Virtual' | 'In-Person' | 'Hybrid';
  venue: string;
  host: string;
  meetingUrl: string;
}

export interface PictureLibraryItem {
  id: number;
  title: string;
  description: string;
  images: string[];
  sortOrder: number;
}

// ── Public reads ──────────────────────────────────────────────────────────

export async function getNews(): Promise<{ news: NewsItem[] | null; error: string | null }> {
  const { data, error } = await apiFetch<{ news: NewsItem[] }>('/news');
  return { news: data?.news ?? null, error };
}

export async function getCourses(): Promise<{ courses: Course[] | null; error: string | null }> {
  const { data, error } = await apiFetch<{ courses: Course[] }>('/courses');
  return { courses: data?.courses ?? null, error };
}

export async function getLearningPaths(): Promise<{ learningPaths: LearningPath[] | null; error: string | null }> {
  const { data, error } = await apiFetch<{ learningPaths: LearningPath[] }>('/learning-paths');
  return { learningPaths: data?.learningPaths ?? null, error };
}

export async function getSessions(): Promise<{ sessions: LiveSession[] | null; error: string | null }> {
  const { data, error } = await apiFetch<{ sessions: LiveSession[] }>('/sessions');
  return { sessions: data?.sessions ?? null, error };
}

export async function getPictureLibrary(): Promise<{ pictures: PictureLibraryItem[] | null; error: string | null }> {
  const { data, error } = await apiFetch<{ pictures: PictureLibraryItem[] }>('/picture-library');
  return { pictures: data?.pictures ?? null, error };
}

// ── Admin: News ───────────────────────────────────────────────────────────

export type NewsInput = {
  title: string; excerpt: string; content: string; date: string; category: string;
  featured: boolean; image: string; images: string[]; url: string; sortOrder?: number;
};

// Generic CMS image upload — used by News, Picture Library, and any other
// content type's image fields. Stores the file in the DB and returns its path.
export async function uploadImage(base64DataUrl: string): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await apiFetch<{ url: string }>('/admin/cms/upload', {
    method: 'POST', body: JSON.stringify({ image: base64DataUrl }),
  });
  return { url: data?.url ?? null, error };
}

export async function createNews(input: NewsInput): Promise<{ newsItem: NewsItem | null; error: string | null }> {
  const { data, error } = await apiFetch<{ newsItem: NewsItem }>('/admin/cms/news', {
    method: 'POST', body: JSON.stringify(input),
  });
  return { newsItem: data?.newsItem ?? null, error };
}

export async function updateNews(id: number, input: Partial<NewsInput>): Promise<{ newsItem: NewsItem | null; error: string | null }> {
  const { data, error } = await apiFetch<{ newsItem: NewsItem }>(`/admin/cms/news/${id}`, {
    method: 'PATCH', body: JSON.stringify(input),
  });
  return { newsItem: data?.newsItem ?? null, error };
}

export async function deleteNews(id: number): Promise<{ error: string | null }> {
  const { error } = await apiFetch(`/admin/cms/news/${id}`, { method: 'DELETE' });
  return { error };
}

// ── Admin: Courses ────────────────────────────────────────────────────────

export type CourseInput = {
  id: string; title: string; description: string; category: string;
  level: string; duration: string; audience: string; modules: number;
  mandatory: boolean; courseUrl?: string; sortOrder?: number;
};

export async function createCourse(input: CourseInput): Promise<{ course: Course | null; error: string | null }> {
  const { data, error } = await apiFetch<{ course: Course }>('/admin/cms/courses', {
    method: 'POST', body: JSON.stringify(input),
  });
  return { course: data?.course ?? null, error };
}

export async function updateCourse(id: string, input: Partial<Omit<CourseInput, 'id'>>): Promise<{ course: Course | null; error: string | null }> {
  const { data, error } = await apiFetch<{ course: Course }>(`/admin/cms/courses/${id}`, {
    method: 'PATCH', body: JSON.stringify(input),
  });
  return { course: data?.course ?? null, error };
}

export async function deleteCourse(id: string): Promise<{ error: string | null }> {
  const { error } = await apiFetch(`/admin/cms/courses/${id}`, { method: 'DELETE' });
  return { error };
}

// ── Admin: Learning Paths ─────────────────────────────────────────────────

export type LearningPathInput = {
  title: string; description: string; audience: string;
  courseIds: string[]; totalDuration: string; icon: string; sortOrder?: number;
};

export async function createLearningPath(input: LearningPathInput): Promise<{ learningPath: LearningPath | null; error: string | null }> {
  const { data, error } = await apiFetch<{ learningPath: LearningPath }>('/admin/cms/learning-paths', {
    method: 'POST', body: JSON.stringify(input),
  });
  return { learningPath: data?.learningPath ?? null, error };
}

export async function updateLearningPath(id: number, input: Partial<LearningPathInput>): Promise<{ learningPath: LearningPath | null; error: string | null }> {
  const { data, error } = await apiFetch<{ learningPath: LearningPath }>(`/admin/cms/learning-paths/${id}`, {
    method: 'PATCH', body: JSON.stringify(input),
  });
  return { learningPath: data?.learningPath ?? null, error };
}

export async function deleteLearningPath(id: number): Promise<{ error: string | null }> {
  const { error } = await apiFetch(`/admin/cms/learning-paths/${id}`, { method: 'DELETE' });
  return { error };
}

// ── Admin: Sessions ───────────────────────────────────────────────────────

export type SessionInput = {
  title: string; date: string; time: string;
  format: 'Virtual' | 'In-Person' | 'Hybrid'; venue: string; host: string; meetingUrl?: string;
};

export async function createSession(input: SessionInput): Promise<{ session: LiveSession | null; error: string | null }> {
  const { data, error } = await apiFetch<{ session: LiveSession }>('/admin/cms/sessions', {
    method: 'POST', body: JSON.stringify(input),
  });
  return { session: data?.session ?? null, error };
}

export async function updateSession(id: number, input: Partial<SessionInput>): Promise<{ session: LiveSession | null; error: string | null }> {
  const { data, error } = await apiFetch<{ session: LiveSession }>(`/admin/cms/sessions/${id}`, {
    method: 'PATCH', body: JSON.stringify(input),
  });
  return { session: data?.session ?? null, error };
}

export async function deleteSession(id: number): Promise<{ error: string | null }> {
  const { error } = await apiFetch(`/admin/cms/sessions/${id}`, { method: 'DELETE' });
  return { error };
}

// ── Admin: Picture Library ────────────────────────────────────────────────

export type PictureLibraryInput = {
  title: string; description: string; images: string[]; sortOrder?: number;
};

export async function createPicture(input: PictureLibraryInput): Promise<{ picture: PictureLibraryItem | null; error: string | null }> {
  const { data, error } = await apiFetch<{ picture: PictureLibraryItem }>('/admin/cms/picture-library', {
    method: 'POST', body: JSON.stringify(input),
  });
  return { picture: data?.picture ?? null, error };
}

export async function updatePicture(id: number, input: Partial<PictureLibraryInput>): Promise<{ picture: PictureLibraryItem | null; error: string | null }> {
  const { data, error } = await apiFetch<{ picture: PictureLibraryItem }>(`/admin/cms/picture-library/${id}`, {
    method: 'PATCH', body: JSON.stringify(input),
  });
  return { picture: data?.picture ?? null, error };
}

export async function deletePicture(id: number): Promise<{ error: string | null }> {
  const { error } = await apiFetch(`/admin/cms/picture-library/${id}`, { method: 'DELETE' });
  return { error };
}
