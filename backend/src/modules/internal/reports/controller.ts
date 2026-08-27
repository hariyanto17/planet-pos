import { Request, Response } from "express";
import { validateConcessionReportQuery } from "./validation";
import * as reportService from "./service";
import { responseHandler } from "../../../utils/responeHandler";

export const getProductPerformanceHandler = async (req: Request, res: Response) => {
  const query = validateConcessionReportQuery(req.query);
  const result = await reportService.getProductPerformanceReport(query);
  return responseHandler.ok(res, result.data, "Product performance report retrieved successfully", {
    summary: result.summary,
    pagination: result.pagination,
    period: { startDate: query.startDate, endDate: query.endDate },
  });
};
