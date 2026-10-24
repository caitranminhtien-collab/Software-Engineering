import type { NextFunction, Request, Response } from "express";
import { db } from "../config/database";
import { getActiveStaffById } from "../services/staff-auth.service";
import type { QueryResultRow } from "pg";

interface LocalMediaVisibilityRow extends QueryResultRow {
  status: "draft" | "in_review" | "published" | "archived";
  attraction_status: string;
  vi_published: boolean;
}

/**
 * Protect uploaded files against guesses of their URL before review/publication.
 * Local files are public only when their DB media, parent attraction and Vietnamese
 * localization have all been published. Authorized Staff can preview drafts.
 * This middleware must run AFTER staffSessionMiddleware and BEFORE express.static.
 * Externally hosted file_url values are outside this server's control.
 */
export async function requirePublishedOrStaffMedia(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Do not cache assets that may later become archived or unpublished.
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.sendStatus(405);
    return;
  }

  // Only serve paths with exactly one numeric attraction directory and one safe filename.
  // LocalMediaStorageAdapter generates UUID filenames, but this also supports old safe names.
  const matched = /^\/([1-9]\d{0,17})\/([A-Za-z0-9][A-Za-z0-9_.-]{0,127})$/.exec(req.path);
  if (!matched || matched[2].includes("..") || !/\.(?:jpg|jpeg|png|gif|webp|mp3|wav)$/i.test(matched[2])) {
    res.sendStatus(404);
    return;
  }
  const attractionId = Number(matched[1]);
  if (!Number.isSafeInteger(attractionId)) {
    res.sendStatus(404);
    return;
  }
  const urlPath = `/uploads/media/${attractionId}/${matched[2]}`;
  try {
    const result = await db.query<LocalMediaVisibilityRow>(
      `SELECT m.status, a.status AS attraction_status,
         EXISTS (
           SELECT 1 FROM public.attraction_localizations AS l
           WHERE l.attraction_id = a.attraction_id
             AND l.language_code = 'vi' AND l.status = 'published'
         ) AS vi_published
       FROM public.attraction_media AS m
       JOIN public.attractions AS a ON a.attraction_id = m.attraction_id
       WHERE m.attraction_id = $1
         AND RIGHT(m.file_url, LENGTH($2)) = $2
       LIMIT 1`,
      [attractionId, urlPath]
    );
    const media = result.rows[0];
    if (!media) {
      res.sendStatus(404);
      return;
    }
    if (media.status === "published" &&
        media.attraction_status === "published" && media.vi_published) {
      next();
      return;
    }
    // Staff uploads and in-review content must never be exposed to anonymous visitors.
    const staffId = req.session?.staffId;
    if (!Number.isSafeInteger(staffId) || !staffId || staffId <= 0) {
      res.sendStatus(404);
      return;
    }
    try {
      const staff = await getActiveStaffById(staffId);
      if (["admin", "reviewer", "editor"].includes(staff.role)) {
        next();
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "StaffAccountNotFoundError") {
        res.sendStatus(404);
        return;
      }
      throw error;
    }
    res.sendStatus(404);
  } catch (error) {
    console.error("Media access verification failed:", error);
    res.status(500).json({error:{code:"MEDIA_ACCESS_ERROR",message:"Unable to verify media access"}});
  }
}
