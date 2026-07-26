import { Request, Response } from "express";
import { responseHandler } from "../../utils/responeHandler";
import * as checkoutService from "./service";

export const checkoutHandler = async (req: Request, res: Response) => {
  const cashierId = req.user ? req.user.id : null;
  const result = await checkoutService.checkout(cashierId, req.body);
  return responseHandler.created(res, result);
};
