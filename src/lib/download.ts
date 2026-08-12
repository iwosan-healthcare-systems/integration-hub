import JSZip from "jszip";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function filenameFromUrl(url: string, fallback: string): string {
  try {
    const base = new URL(url).pathname.split("/").pop();
    return base && base.includes(".") ? base : fallback;
  } catch {
    return fallback;
  }
}

// Forces a real download regardless of origin — the `download` attribute on
// an <a> is ignored by browsers for cross-origin URLs, and images here are
// often served from a different origin than the site itself.
export async function downloadUrl(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  saveBlob(await res.blob(), filename);
}

export async function downloadImagesAsZip(
  urls: string[],
  zipName: string
): Promise<{ succeeded: number; failed: number }> {
  const fetched = await Promise.all(
    urls.map(async (url, i) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.arrayBuffer();
        return { name: filenameFromUrl(url, `image-${i + 1}.jpg`), data };
      } catch {
        return null;
      }
    })
  );

  const zip = new JSZip();
  const usedNames = new Set<string>();
  let succeeded = 0;
  for (const r of fetched) {
    if (!r) continue;
    let name = r.name;
    let n = 1;
    while (usedNames.has(name)) {
      const dot = r.name.lastIndexOf(".");
      n += 1;
      name = dot >= 0 ? `${r.name.slice(0, dot)}-${n}${r.name.slice(dot)}` : `${r.name}-${n}`;
    }
    usedNames.add(name);
    zip.file(name, r.data);
    succeeded += 1;
  }

  const failed = fetched.length - succeeded;
  if (succeeded === 0) return { succeeded: 0, failed };

  const blob = await zip.generateAsync({ type: "blob" });
  saveBlob(blob, zipName.endsWith(".zip") ? zipName : `${zipName}.zip`);
  return { succeeded, failed };
}
