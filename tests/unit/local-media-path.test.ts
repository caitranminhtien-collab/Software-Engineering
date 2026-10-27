import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isLocalMediaPath,
} from "../../src/adapters/media/local-media-path";

describe("isLocalMediaPath", () => {
  it.each([
    "/uploads/media/1/photo.jpg",
    "/uploads/media/15/test-image.png",
    "/uploads/media/3/audio.mp3",
    "/uploads/media/3/recording.wav",
  ])("accepts a valid local path: %s", (value) => {
    expect(isLocalMediaPath(value)).toBe(true);
  });

  it.each([
    "/uploads/media/0/photo.jpg",
    "/uploads/media/9007199254740992/photo.jpg",
    "/uploads/media/1/../photo.jpg",
    "/uploads/media/1/photo..jpg",
    "/uploads/media/1/subfolder/photo.jpg",
    "/uploads/media/1/photo.svg",
    "/uploads/media/1/photo.jpg?download=1",
    "/uploads/media/1/photo.jpg#preview",
    "//example.com/uploads/media/1/photo.jpg",
    "https://example.com/uploads/media/1/photo.jpg",
    "/uploads/media/1/%2e%2e.jpg",
    "",
  ])("rejects an invalid local path: %s", (value) => {
    expect(isLocalMediaPath(value)).toBe(false);
  });
});