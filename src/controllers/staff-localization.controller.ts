import { TranslationProviderError } from "../adapters/llm/gemini-translation.provider";
import type { TranslationLanguage } from "../adapters/llm/gemini-translation.provider";
import type {
  Request,
  Response,
} from "express";

import {
  StaffLocalizationAttractionNotFoundError,
  StaffLocalizationNotFoundError,
  getStaffLocalization,
  StaffLocalizationWorkflowConflictError,
  upsertStaffLocalization,
  generateStaffLocalizationDraft,
  regenerateStaffLocalizationDraft,
  StaffLocalizationTranslationConflictError,
} from "../services/staff-localization.service";

import type {
  StaffLocalizationParams,
  UpsertStaffLocalizationBody,
} from "../validators/staff-localization.validator";

export async function getStaffLocalizationController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const { attractionId, language } = res.locals
      .staffLocalizationParams as StaffLocalizationParams;
    const localization = await getStaffLocalization(attractionId, language);
    res.status(200).json({ data: localization });
  } catch (error) {
    if (error instanceof StaffLocalizationAttractionNotFoundError ||
        error instanceof StaffLocalizationNotFoundError) {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: error.message },
      });
      return;
    }
    console.error("Get staff localization failed:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to load localization",
      },
    });
  }
}

export async function upsertStaffLocalizationController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      attractionId,
      language,
    } = res.locals
      .staffLocalizationParams as StaffLocalizationParams;

    const body =
      res.locals
        .upsertStaffLocalizationBody as UpsertStaffLocalizationBody;

    const localization =
      await upsertStaffLocalization(
        attractionId,
        language,
        body
      );

    res.status(200).json({
      data: localization,
    });
  } catch (error) {
    if (
      error instanceof
      StaffLocalizationAttractionNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Attraction not found",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffLocalizationWorkflowConflictError
    ) {
      res.status(409).json({
        error: {
          code: "WORKFLOW_CONFLICT",
          message:
            "Localization cannot be edited in its current status",
        },
      });

      return;
    }

    console.error(
      "Upsert staff localization failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to save localization",
      },
    });
  }
}
export async function generateStaffLocalizationController(_req: Request, res: Response): Promise<void> {
  const {attractionId, language} = res.locals.staffLocalizationParams as StaffLocalizationParams;
  try {
    const draft = await generateStaffLocalizationDraft(attractionId, language as TranslationLanguage);
    res.status(201).json({data: draft});
  } catch (error) {
    if (error instanceof StaffLocalizationAttractionNotFoundError) {
      res.status(404).json({error: {code: 'NOT_FOUND', message: error.message}});
    } else if (error instanceof StaffLocalizationTranslationConflictError) {
      res.status(409).json({error: {code: 'WORKFLOW_CONFLICT', message: error.message}});
    } else if (error instanceof TranslationProviderError) {
      res.status(502).json({error: {code: 'TRANSLATION_FAILED', message: error.message}});
    } else {
      console.error('Staff localization translation failed:', error);
      res.status(500).json({error: {code: 'INTERNAL_SERVER_ERROR', message: 'Unable to generate localization'}});
    }
  }
}


export async function regenerateStaffLocalizationController(_req: Request, res: Response): Promise<void> {
  const {attractionId, language} = res.locals.staffLocalizationParams as StaffLocalizationParams;
  try {
    const draft = await regenerateStaffLocalizationDraft(attractionId, language as TranslationLanguage);
    res.status(200).json({data: draft});
  } catch (error) {
    if (error instanceof StaffLocalizationAttractionNotFoundError ||
        error instanceof StaffLocalizationNotFoundError) {
      res.status(404).json({error: {code: 'NOT_FOUND', message: error.message}});
    } else if (error instanceof StaffLocalizationTranslationConflictError ||
               error instanceof StaffLocalizationWorkflowConflictError) {
      res.status(409).json({error: {code: 'WORKFLOW_CONFLICT', message: error.message}});
    } else if (error instanceof TranslationProviderError) {
      res.status(502).json({error: {code: 'TRANSLATION_FAILED', message: error.message}});
    } else {
      console.error('Staff localization retranslation failed:', error);
      res.status(500).json({error: {code: 'INTERNAL_SERVER_ERROR', message: 'Unable to regenerate localization'}});
    }
  }
}
