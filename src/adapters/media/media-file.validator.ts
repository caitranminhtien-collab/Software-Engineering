export type MediaFileType =
  | "image"
  | "audio";

export interface ValidatedMediaFile {
  mediaType: MediaFileType;
  mimeType: string;
  extension: string;
  sizeBytes: number;
}

export class MediaFileValidationError
  extends Error {
  constructor(message: string) {
    super(message);
    this.name =
      "MediaFileValidationError";
  }
}

function getPositiveIntegerConfig(
  rawValue: string | undefined,
  fallback: number
): number {
  const parsed =
    Number(rawValue);

  if (
    Number.isInteger(parsed) &&
    parsed > 0
  ) {
    return parsed;
  }

  return fallback;
}

const MAX_IMAGE_BYTES =
  getPositiveIntegerConfig(
    process.env.MEDIA_MAX_IMAGE_BYTES,
    8 * 1024 * 1024
  );

const MAX_AUDIO_BYTES =
  getPositiveIntegerConfig(
    process.env.MEDIA_MAX_AUDIO_BYTES,
    25 * 1024 * 1024
  );

function hasBytes(
  buffer: Buffer,
  expected: number[],
  offset = 0
): boolean {
  if (
    buffer.length <
    offset + expected.length
  ) {
    return false;
  }

  return expected.every(
    (value, index) =>
      buffer[offset + index] ===
      value
  );
}

function hasAscii(
  buffer: Buffer,
  value: string,
  offset = 0
): boolean {
  if (
    buffer.length <
    offset + value.length
  ) {
    return false;
  }

  return (
    buffer
      .subarray(
        offset,
        offset + value.length
      )
      .toString("ascii") ===
    value
  );
}

function detectMediaFile(
  buffer: Buffer
): Omit<
  ValidatedMediaFile,
  "sizeBytes"
> | null {
  if (
    hasBytes(
      buffer,
      [0xff, 0xd8, 0xff]
    )
  ) {
    return {
      mediaType: "image",
      mimeType: "image/jpeg",
      extension: "jpg",
    };
  }

  if (
    hasBytes(
      buffer,
      [
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
      ]
    )
  ) {
    return {
      mediaType: "image",
      mimeType: "image/png",
      extension: "png",
    };
  }

  if (
    hasAscii(
      buffer,
      "GIF87a"
    ) ||
    hasAscii(
      buffer,
      "GIF89a"
    )
  ) {
    return {
      mediaType: "image",
      mimeType: "image/gif",
      extension: "gif",
    };
  }

  if (
    hasAscii(
      buffer,
      "RIFF"
    ) &&
    hasAscii(
      buffer,
      "WEBP",
      8
    )
  ) {
    return {
      mediaType: "image",
      mimeType: "image/webp",
      extension: "webp",
    };
  }

  if (
    hasAscii(
      buffer,
      "RIFF"
    ) &&
    hasAscii(
      buffer,
      "WAVE",
      8
    )
  ) {
    return {
      mediaType: "audio",
      mimeType: "audio/wav",
      extension: "wav",
    };
  }

  if (
    hasAscii(
      buffer,
      "ID3"
    )
  ) {
    return {
      mediaType: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
    };
  }

  if (
    buffer.length >= 2 &&
    buffer[0] === 0xff &&
    (buffer[1] & 0xe0) === 0xe0
  ) {
    return {
      mediaType: "audio",
      mimeType: "audio/mpeg",
      extension: "mp3",
    };
  }

  return null;
}

function validateReportedMimeType(
  reportedMimeType: string,
  detectedMimeType: string
): void {
  const normalized =
    reportedMimeType
      .trim()
      .toLowerCase();

  if (
    normalized ===
      "application/octet-stream" ||
    normalized === detectedMimeType
  ) {
    return;
  }

  const wavAliases =
    new Set([
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
    ]);

  const mp3Aliases =
    new Set([
      "audio/mpeg",
      "audio/mp3",
    ]);

  if (
    detectedMimeType ===
      "audio/wav" &&
    wavAliases.has(
      normalized
    )
  ) {
    return;
  }

  if (
    detectedMimeType ===
      "audio/mpeg" &&
    mp3Aliases.has(
      normalized
    )
  ) {
    return;
  }

  throw new MediaFileValidationError(
    "uploaded file MIME type does not match its file signature"
  );
}

export function validateUploadedMediaFile(
  file: Express.Multer.File,
  expectedMediaType: MediaFileType
): ValidatedMediaFile {
  if (
    !file.buffer ||
    file.buffer.length === 0
  ) {
    throw new MediaFileValidationError(
      "uploaded media file must not be empty"
    );
  }

  const detected =
    detectMediaFile(
      file.buffer
    );

  if (!detected) {
    throw new MediaFileValidationError(
      "unsupported or unrecognized media file signature"
    );
  }

  if (
    detected.mediaType !==
    expectedMediaType
  ) {
    throw new MediaFileValidationError(
      `uploaded file signature is ${detected.mediaType}, not ${expectedMediaType}`
    );
  }

  validateReportedMimeType(
    file.mimetype,
    detected.mimeType
  );

  const maxBytes =
    expectedMediaType ===
    "image"
      ? MAX_IMAGE_BYTES
      : MAX_AUDIO_BYTES;

  if (
    file.buffer.length >
    maxBytes
  ) {
    const maxMb =
      Math.floor(
        maxBytes /
          (1024 * 1024)
      );

    throw new MediaFileValidationError(
      `${expectedMediaType} file must not exceed ${maxMb} MB`
    );
  }

  return {
    ...detected,
    sizeBytes:
      file.buffer.length,
  };
}