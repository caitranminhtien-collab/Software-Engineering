import type {Request, Response} from "express";
import {getStaffAnalytics} from "../services/staff-analytics.service";

export async function getStaffAnalyticsController(req: Request, res: Response): Promise<void> {
  const requested = req.query.days ?? "7";
  if (requested !== "7" && requested !== "30") {
    res.status(400).json({error:{code:"VALIDATION_ERROR",message:"days must be 7 or 30"}});
    return;
  }
  try {
    const data = await getStaffAnalytics(requested === "7" ? 7 : 30);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({data});
  } catch (error) {
    console.error("Staff analytics report failed:", error);
    res.status(500).json({error:{code:"INTERNAL_SERVER_ERROR",message:"Unable to load analytics"}});
  }
}
