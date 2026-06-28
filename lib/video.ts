// Recipe ↔ video linking. Given any video URL a user pastes, work out the
// platform and how to show it: YouTube plays inline (embed), Instagram is just
// linked out (no reliable embed for reels). Pure functions, no I/O.

export type VideoInfo = {
  platform: "youtube" | "instagram";
  /** Normalized watch/permalink URL to open in a new tab. */
  watchUrl: string;
  /** Inline player URL (YouTube only). */
  embedUrl: string | null;
  /** Thumbnail image URL, if we can derive one (YouTube only). */
  thumbnail: string | null;
};

function youtubeId(url: string): string | null {
  // Handles watch?v=, youtu.be/, /shorts/, /embed/, /live/.
  const patterns = [
    /[?&]v=([\w-]{6,})/,
    /youtu\.be\/([\w-]{6,})/,
    /\/shorts\/([\w-]{6,})/,
    /\/embed\/([\w-]{6,})/,
    /\/live\/([\w-]{6,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function instagramPermalink(url: string): string | null {
  // /reel/CODE, /reels/CODE, /p/CODE, /tv/CODE — normalize to a clean permalink.
  const m = url.match(/instagram\.com\/(?:reels?|p|tv)\/([\w-]+)/i);
  if (!m) return null;
  const kind = /\/reels?\//i.test(url) ? "reel" : url.includes("/tv/") ? "tv" : "p";
  return `https://www.instagram.com/${kind}/${m[1]}/`;
}

/** Parse a pasted video URL. Returns null for empty/unrecognized input. */
export function videoInfo(url: string | null | undefined): VideoInfo | null {
  if (!url || !url.trim()) return null;
  const u = url.trim();

  if (/youtube\.com|youtu\.be/i.test(u)) {
    const id = youtubeId(u);
    if (!id) return null;
    return {
      platform: "youtube",
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (/instagram\.com/i.test(u)) {
    const permalink = instagramPermalink(u);
    if (!permalink) return null;
    return { platform: "instagram", watchUrl: permalink, embedUrl: null, thumbnail: null };
  }

  return null;
}
