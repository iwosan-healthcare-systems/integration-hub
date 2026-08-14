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
  video: string;
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
  video: string;
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
  entities: string[];
  image: string;
}

export interface PictureLibraryItem {
  id: number;
  title: string;
  description: string;
  images: string[];
  sortOrder: number;
}

export interface Video {
  id: number;
  albumId: number | null;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  fileSize: number;
  sortOrder: number;
}

export interface VideoAlbum {
  id: number;
  title: string;
  description: string;
  sortOrder: number;
  videos: Video[];
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

// Standalone videos only (no album) — for the Video Library's ungrouped section
export async function getVideos(): Promise<{ videos: Video[] | null; error: string | null }> {
  const { data, error } = await apiFetch<{ videos: Video[] }>('/videos');
  return { videos: data?.videos ?? null, error };
}

export async function getVideoAlbums(): Promise<{ albums: VideoAlbum[] | null; error: string | null }> {
  const { data, error } = await apiFetch<{ albums: VideoAlbum[] }>('/video-albums');
  return { albums: data?.albums ?? null, error };
}

// Mints a short-lived signed URL to actually stream the video — fetched on
// demand right before playing, not baked into the list response.
export async function getVideoPlayUrl(id: number): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await apiFetch<{ url: string }>(`/videos/${id}/play`);
  return { url: data?.url ?? null, error };
}

// Same as above, but for a video that lives inline on a News article or
// Course (an S3 key with no `videos` row / id of its own).
export async function getVideoPlayUrlByKey(key: string): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await apiFetch<{ url: string }>(`/video-play-url?key=${encodeURIComponent(key)}`);
  return { url: data?.url ?? null, error };
}

// ── Admin: News ───────────────────────────────────────────────────────────

export type NewsInput = {
  title: string; excerpt: string; content: string; date: string; category: string;
  featured: boolean; image: string; images: string[]; video?: string; url: string; sortOrder?: number;
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
  mandatory: boolean; courseUrl?: string; video?: string; sortOrder?: number;
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
  entities: string[]; image: string;
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

// ── Admin: Video Library ─────────────────────────────────────────────────

export type VideoAlbumInput = {
  title: string; description: string; sortOrder?: number;
};

export async function createVideoAlbum(input: VideoAlbumInput): Promise<{ album: VideoAlbum | null; error: string | null }> {
  const { data, error } = await apiFetch<{ album: VideoAlbum }>('/admin/cms/video-albums', {
    method: 'POST', body: JSON.stringify(input),
  });
  return { album: data?.album ?? null, error };
}

export async function updateVideoAlbum(id: number, input: Partial<VideoAlbumInput>): Promise<{ album: VideoAlbum | null; error: string | null }> {
  const { data, error } = await apiFetch<{ album: VideoAlbum }>(`/admin/cms/video-albums/${id}`, {
    method: 'PATCH', body: JSON.stringify(input),
  });
  return { album: data?.album ?? null, error };
}

export async function deleteVideoAlbum(id: number): Promise<{ error: string | null }> {
  const { error } = await apiFetch(`/admin/cms/video-albums/${id}`, { method: 'DELETE' });
  return { error };
}

export type VideoInput = {
  albumId?: number | null; title: string; description: string; thumbnail: string; duration: string; sortOrder?: number;
};

// Step 1 of uploading: ask the server for a presigned S3 PUT URL, then
// PUT the file straight to S3 yourself — the file never touches our server.
export async function requestVideoUploadUrl(
  contentType: string,
  fileSize: number
): Promise<{ uploadUrl: string | null; key: string | null; error: string | null }> {
  const { data, error } = await apiFetch<{ uploadUrl: string; key: string }>('/admin/cms/videos/upload-url', {
    method: 'POST', body: JSON.stringify({ contentType, fileSize }),
  });
  return { uploadUrl: data?.uploadUrl ?? null, key: data?.key ?? null, error };
}

export async function uploadVideoToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ error: string | null }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve({ error: null });
      else resolve({ error: `Upload failed (${xhr.status})` });
    };
    xhr.onerror = () => resolve({ error: 'Network error during upload' });
    xhr.send(file);
  });
}

// Step 2: after the S3 upload succeeds, save the metadata + S3 key as a row
export async function createVideo(
  input: VideoInput & { key: string; fileSize: number }
): Promise<{ video: Video | null; error: string | null }> {
  const { data, error } = await apiFetch<{ video: Video }>('/admin/cms/videos', {
    method: 'POST', body: JSON.stringify(input),
  });
  return { video: data?.video ?? null, error };
}

export async function updateVideo(id: number, input: Partial<VideoInput>): Promise<{ video: Video | null; error: string | null }> {
  const { data, error } = await apiFetch<{ video: Video }>(`/admin/cms/videos/${id}`, {
    method: 'PATCH', body: JSON.stringify(input),
  });
  return { video: data?.video ?? null, error };
}

export async function deleteVideo(id: number): Promise<{ error: string | null }> {
  const { error } = await apiFetch(`/admin/cms/videos/${id}`, { method: 'DELETE' });
  return { error };
}

// ── AI Assist (title/description generation + rewrite, used across CMS forms)

export type AiAssistContentType = 'news' | 'course' | 'video' | 'video-album' | 'picture-album';
export type AiAssistField = 'title' | 'excerpt' | 'content' | 'description';

export async function aiAssist(input: {
  contentType: AiAssistContentType;
  field: AiAssistField;
  mode: 'generate' | 'rewrite';
  existingText?: string;
  context?: Record<string, string>;
}): Promise<{ text: string | null; error: string | null }> {
  const { data, error } = await apiFetch<{ text: string }>('/admin/cms/ai-assist', {
    method: 'POST', body: JSON.stringify(input),
  });
  return { text: data?.text ?? null, error };
}
