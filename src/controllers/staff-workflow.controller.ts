import type {
  Request,
  Response,
} from "express";

import {
  StaffKnowledgeReviewPrerequisiteError,
  StaffPublishReadinessError,
  StaffPublishResourceError,
  StaffWorkflowConflictError,
  StaffWorkflowNotFoundError,
  StaffWorkflowReviewConflictError,
  publishStaffWorkflow,
  reviewStaffWorkflow,
  submitStaffWorkflow,
} from "../services/staff-workflow.service";

import type {
  StaffReviewBody,
  StaffWorkflowParams,
} from "../validators/staff-workflow.validator";

export async function submitStaffWorkflowController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      resource,
      resourceId,
    } = res.locals
      .staffWorkflowParams as StaffWorkflowParams;

    const result =
      await submitStaffWorkflow(
        resource,
        resourceId
      );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (
      error instanceof
      StaffWorkflowNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message:
            "Workflow resource not found",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffWorkflowConflictError
    ) {
      res.status(409).json({
        error: {
          code: "WORKFLOW_CONFLICT",
          message:
            "Resource cannot be submitted in its current status",
        },
      });

      return;
    }

    console.error(
      "Submit staff workflow failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to submit resource for review",
      },
    });
  }
}

export async function reviewStaffWorkflowController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      resource,
      resourceId,
    } = res.locals
      .staffWorkflowParams as StaffWorkflowParams;

    const {
      decision,
    } = res.locals
      .staffReviewBody as StaffReviewBody;

    const result =
      await reviewStaffWorkflow(
        resource,
        resourceId,
        decision
      );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (
      error instanceof
      StaffWorkflowNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message:
            "Workflow resource not found",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffWorkflowReviewConflictError
    ) {
      res.status(409).json({
        error: {
          code: "WORKFLOW_CONFLICT",
          message:
            "Resource cannot be reviewed in its current status",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffKnowledgeReviewPrerequisiteError
    ) {
      res.status(409).json({
        error: {
          code:
            "KNOWLEDGE_REVIEW_PREREQUISITE",
          message:
            "Knowledge document review requires the indexing workflow",
        },
      });

      return;
    }

    console.error(
      "Review staff workflow failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to review resource",
      },
    });
  }
}

export async function publishStaffWorkflowController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      resource,
      resourceId,
    } = res.locals
      .staffWorkflowParams as StaffWorkflowParams;

    const staff = res.locals.staff as {
      id: number;
    };

    const result =
      await publishStaffWorkflow(
        resource,
        resourceId,
        staff.id
      );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (
      error instanceof
      StaffWorkflowNotFoundError
    ) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message:
            "Workflow resource not found",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffPublishReadinessError
    ) {
      res.status(409).json({
        error: {
          code:
            "PUBLISH_READINESS_ERROR",
          message: error.message,
        },
      });

      return;
    }

    if (
      error instanceof
      StaffPublishResourceError
    ) {
      res.status(409).json({
        error: {
          code:
            "PUBLISH_NOT_SUPPORTED",
          message:
            "This resource cannot use the visitor publish workflow",
        },
      });

      return;
    }

    if (
      error instanceof
      StaffWorkflowReviewConflictError
    ) {
      res.status(409).json({
        error: {
          code: "WORKFLOW_CONFLICT",
          message:
            "Resource cannot be published in its current status",
        },
      });

      return;
    }

    console.error(
      "Publish staff workflow failed:",
      error
    );

    res.status(500).json({
      error: {
        code:
          "INTERNAL_SERVER_ERROR",
        message:
          "Unable to publish resource",
      },
    });
  }
}