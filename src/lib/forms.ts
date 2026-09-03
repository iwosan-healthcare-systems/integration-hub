import { slugify } from './utils';

export function learningFormPath(form: { title: string }): string {
  const slug = slugify(form.title);
  return `/learning/assessment/${slug || 'assessment'}`;
}

export function parseLearningFormSlug(value: string | undefined): string | null {
  if (!value) return null;
  const slug = slugify(value);
  return slug || null;
}
