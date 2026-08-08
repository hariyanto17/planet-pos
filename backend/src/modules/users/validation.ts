import Joi from "joi";
import { UserRole } from "@prisma/client";

export const createUserSchema = Joi.object({
  fullName: Joi.string().required().messages({
    "string.empty": "Nama lengkap wajib diisi"
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    "string.empty": "Nama pengguna wajib diisi",
    "string.min": "Nama pengguna minimal 3 karakter",
    "string.max": "Nama pengguna maksimal 30 karakter"
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Kata sandi wajib diisi",
    "string.min": "Kata sandi minimal 6 karakter"
  }),
  confirmPassword: Joi.any().equal(Joi.ref("password")).required().messages({
    "any.only": "Konfirmasi kata sandi tidak cocok",
    "any.required": "Konfirmasi kata sandi wajib diisi"
  }),
  role: Joi.string().valid(...Object.values(UserRole)).required().messages({
    "any.only": "Peran akses tidak valid",
    "any.required": "Peran akses wajib dipilih"
  }),
  isActive: Joi.boolean().default(true),
  warehouseId: Joi.string().allow("", null).optional()
});

export const updateUserSchema = Joi.object({
  fullName: Joi.string().required().messages({
    "string.empty": "Nama lengkap wajib diisi"
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    "string.empty": "Nama pengguna wajib diisi",
    "string.min": "Nama pengguna minimal 3 karakter",
    "string.max": "Nama pengguna maksimal 30 karakter"
  }),
  role: Joi.string().valid(...Object.values(UserRole)).required().messages({
    "any.only": "Peran akses tidak valid",
    "any.required": "Peran akses wajib dipilih"
  }),
  isActive: Joi.boolean().required().messages({
    "any.required": "Status wajib diisi"
  }),
  warehouseId: Joi.string().allow("", null).optional()
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string().min(6).required().messages({
    "string.empty": "Kata sandi baru wajib diisi",
    "string.min": "Kata sandi baru minimal 6 karakter"
  }),
  confirmPassword: Joi.any().equal(Joi.ref("password")).required().messages({
    "any.only": "Konfirmasi kata sandi tidak cocok",
    "any.required": "Konfirmasi kata sandi wajib diisi"
  })
});
