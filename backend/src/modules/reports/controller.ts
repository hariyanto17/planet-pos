import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as reportsService from "./service";
import { reportQuerySchema, productReportQuerySchema, shiftsReportQuerySchema } from "./validation";
import { AppError } from "../../utils/errorHandler";

const getDefaultDateRange = (req: Request) => {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const startDate = req.query.startDate ? String(req.query.startDate) : thirtyDaysAgo.toISOString().split("T")[0];
  const endDate = req.query.endDate ? String(req.query.endDate) : today.toISOString().split("T")[0];

  return { startDate, endDate };
};

export const getSummary = async (req: Request, res: Response) => {
  const { startDate, endDate } = getDefaultDateRange(req);
  const { error } = reportQuerySchema.validate({ startDate, endDate });
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const report = await reportsService.getSummaryReport(startDate, endDate);
  return responseHandler.ok(res, report);
};

export const getSales = async (req: Request, res: Response) => {
  const { startDate, endDate } = getDefaultDateRange(req);
  const { error } = reportQuerySchema.validate({ startDate, endDate });
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const report = await reportsService.getSalesReport(startDate, endDate);
  return responseHandler.ok(res, report);
};

export const getPayments = async (req: Request, res: Response) => {
  const { startDate, endDate } = getDefaultDateRange(req);
  const { error } = reportQuerySchema.validate({ startDate, endDate });
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const report = await reportsService.getPaymentReport(startDate, endDate);
  return responseHandler.ok(res, report);
};

export const getReconciliation = async (req: Request, res: Response) => {
  const { startDate, endDate } = getDefaultDateRange(req);
  const { error } = reportQuerySchema.validate({ startDate, endDate });
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const report = await reportsService.getReconciliationReport(startDate, endDate);
  return responseHandler.ok(res, report);
};

export const getProducts = async (req: Request, res: Response) => {
  const { startDate, endDate } = getDefaultDateRange(req);
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;

  const { error } = productReportQuerySchema.validate({ startDate, endDate, page, limit, categoryId });
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const report = await reportsService.getProductSalesReport(startDate, endDate, { page, limit, categoryId });
  return responseHandler.ok(res, report);
};

export const getPaymentAudit = async (req: Request, res: Response) => {
  const { startDate, endDate } = getDefaultDateRange(req);
  const { error } = reportQuerySchema.validate({ startDate, endDate });
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const report = await reportsService.getPaymentAudit(startDate, endDate);
  return responseHandler.ok(res, report);
};

export const getOrderAudit = async (req: Request, res: Response) => {
  const { startDate, endDate } = getDefaultDateRange(req);
  const { error } = reportQuerySchema.validate({ startDate, endDate });
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const report = await reportsService.getOrderAudit(startDate, endDate);
  return responseHandler.ok(res, report);
};

export const getSnapshot = async (req: Request, res: Response) => {
  const businessDate = req.query.businessDate ? String(req.query.businessDate) : new Date().toISOString().split("T")[0];
  const report = await reportsService.getAccountingSnapshot(businessDate);
  return responseHandler.ok(res, report);
};

export const getShifts = async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
  const cashierId = req.query.cashierId ? String(req.query.cashierId) : undefined;
  const shiftStatus = req.query.shiftStatus ? String(req.query.shiftStatus) : undefined;
  const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
  const sortOrder = req.query.sortOrder ? String(req.query.sortOrder) : undefined;

  const { error } = shiftsReportQuerySchema.validate({
    page,
    limit,
    startDate,
    endDate,
    cashierId,
    shiftStatus,
    sortBy,
    sortOrder,
  });

  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const report = await reportsService.getShiftsReport({
    page,
    limit,
    startDate,
    endDate,
    cashierId,
    shiftStatus: shiftStatus as any,
    sortBy,
    sortOrder: sortOrder as any,
  });

  return responseHandler.ok(res, report);
};
