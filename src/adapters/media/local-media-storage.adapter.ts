import {
  randomUUID,
} from "node:crypto";

import {
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  join,
  resolve,
} from "node:path";

import type {
  MediaFileType,
  ValidatedMediaFile,
} from "./media-file.validator";

export interface SaveLocalMediaInput {
  attractionId: number;
  mediaType: MediaFileType;
  buffer: Buffer;
  validatedFile: ValidatedMediaFile;
}

export interface StoredLocalMediaFile {
  publicUrl: string;
  absolutePath: string;
}



class LocalMediaStorageAdapter {
  private readonly rootDirectory =
    resolve(
      process.cwd(),
      "uploads",
      "media"
    );

  async save(
    input: SaveLocalMediaInput
  ): Promise<StoredLocalMediaFile> {
    const attractionDirectory =
      join(
        this.rootDirectory,
        String(
          input.attractionId
        )
      );

    await mkdir(
      attractionDirectory,
      {
        recursive: true,
      }
    );

    /*
     * Never trust the original filename.
     * The server generates the stored name
     * from a random UUID + detected extension.
     */
    const filename =
      `${randomUUID()}.${input.validatedFile.extension}`;

    const absolutePath =
      join(
        attractionDirectory,
        filename
      );

    await writeFile(
      absolutePath,
      input.buffer,
      {
        flag: "wx",
      }
    );

       // Lưu đường dẫn độc lập với domain của môi trường.
    const publicUrl =
      `/uploads/media/${input.attractionId}/${filename}`;

    return {
      publicUrl,
      absolutePath,
    };
  }

  async remove(
    absolutePath: string
  ): Promise<void> {
    await rm(
      absolutePath,
      {
        force: true,
      }
    );
  }
}

export const localMediaStorage =
  new LocalMediaStorageAdapter();