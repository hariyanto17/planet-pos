import Joi from "joi";

export const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.any().equal(Joi.ref("newPassword")).required()
    .messages({ "any.only": "Konfirmasi kata sandi baru tidak cocok" }),
});
