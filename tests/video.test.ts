import { describe, it, expect } from "vitest";
import { videoInfo } from "../lib/video";

describe("videoInfo", () => {
  it("returns null for empty/blank/unrecognized", () => {
    expect(videoInfo(null)).toBeNull();
    expect(videoInfo("")).toBeNull();
    expect(videoInfo("   ")).toBeNull();
    expect(videoInfo("https://example.com/foo")).toBeNull();
  });

  it("parses a standard watch URL (with extra params)", () => {
    const v = videoInfo("https://www.youtube.com/watch?v=_RoKf9es8wA&t=5s");
    expect(v?.platform).toBe("youtube");
    expect(v?.watchUrl).toBe("https://www.youtube.com/watch?v=_RoKf9es8wA");
    expect(v?.embedUrl).toBe("https://www.youtube.com/embed/_RoKf9es8wA");
    expect(v?.thumbnail).toBe("https://img.youtube.com/vi/_RoKf9es8wA/hqdefault.jpg");
  });

  it("parses shorts, youtu.be, and embed forms to the same id", () => {
    for (const url of [
      "https://www.youtube.com/shorts/f-oeTEJhbGg",
      "https://youtu.be/f-oeTEJhbGg",
      "https://www.youtube.com/embed/f-oeTEJhbGg",
    ]) {
      expect(videoInfo(url)?.embedUrl).toBe("https://www.youtube.com/embed/f-oeTEJhbGg");
    }
  });

  it("parses Instagram reel/post links and normalizes the permalink", () => {
    const v = videoInfo("https://www.instagram.com/reels/DYxEDTeOQA0/");
    expect(v?.platform).toBe("instagram");
    expect(v?.watchUrl).toBe("https://www.instagram.com/reel/DYxEDTeOQA0/");
    expect(v?.embedUrl).toBeNull();
    expect(videoInfo("https://instagram.com/p/ABC123/")?.watchUrl).toBe(
      "https://www.instagram.com/p/ABC123/",
    );
  });
});
