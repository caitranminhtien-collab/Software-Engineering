"use strict";

const fixture = {
  attractions: [
    {
      slug: "be08-imperial-city",
      name: "BE08 Imperial City",
      latitude: 16.4698,
      longitude: 107.5792,
    },
    {
      slug: "be08-palace",
      name: "BE08 Palace",
      latitude: 16.4495,
      longitude: 107.6003,
    },
  ],
  routeSlug: "be08-walking-route",
  // A self-contained 1x1 PNG; no network or personal upload is needed.
  mediaName: "be08-pixel.png",
  mediaMime: "image/png",
  mediaBytes: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==",
    "base64"
  ),
};

module.exports = fixture;
