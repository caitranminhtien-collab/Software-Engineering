import type {
  NextFunction,
  Request,
  Response,
} from "express";

export type StaffWorkflowResource =
  | "attractions"
  | "routes"
  | "localizations"
  | "media"
  | "knowledge-documents";

export interface StaffWorkflowParams {
  resource: StaffWorkflowResource;
  resourceId: number;
}

const supportedResources:
  StaffWorkflowResource[] = [
    "attractions",
    "routes",
    "localizations",
    "media",
    "knowledge-documents",
  ];

export function validateStaffWorkflowParams(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const resource = req.params.resource;

  const resourceId = Number(
    req.params.id
  );

  const errors: string[] = [];

  if (
    !supportedResources.includes(
      resource as StaffWorkflowResource
    )
  ) {
    errors.push(
      "unsupported workflow resource"
    );
  }

  if (
    !Number.isInteger(resourceId) ||
    resourceId <= 0
  ) {
    errors.push(
      "resource id must be a positive integer"
    );
  }

  if (errors.length > 0) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message:
          "Invalid workflow parameters",
        details: errors,
      },
    });

    return;
  }

  res.locals.staffWorkflowParams = {
    resource:
      resource as StaffWorkflowResource,
    resourceId,
  } satisfies StaffWorkflowParams;

  next();
}

export interface StaffReviewBody {
  decision: "approve" | "reject";
}

export function validateStaffReviewBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const decision =
    typeof req.body.decision === "string"
      ? req.body.decision.trim().toLowerCase()
      : "";

  if (
    decision !== "approve" &&
    decision !== "reject"
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid review body",
        details: [
          "decision must be approve or reject",
        ],
      },
    });

    return;
  }

  res.locals.staffReviewBody = {
    decision,
  } satisfies StaffReviewBody;

  next();
}