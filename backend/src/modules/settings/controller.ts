import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as settingsService from "./service";
import { updateSettingsSchema } from "./validation";
import { AppError } from "../../utils/errorHandler";

export const getAppSettings = async (req: Request, res: Response) => {
  const settings = await settingsService.getSettings();
  return responseHandler.ok(res, settings);
};

export const updateAppSettings = async (req: Request, res: Response) => {
  const { error, value } = updateSettingsSchema.validate(req.body);
  if (error) {
    throw new AppError("BAD_REQUEST", error.details[0].message);
  }

  const updated = await settingsService.updateSettings(value);
  return responseHandler.ok(res, updated);
};
