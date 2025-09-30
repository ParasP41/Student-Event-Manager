import { Router } from "express";
import { handlerSignUp, handlerLogin, handlerLogOut } from "../controller/auth.controller.js";
import { verifyToken } from '../middleware/verifyToken.middleware.js'

const authRouter = Router();


authRouter.route('/signup').post(handlerSignUp);
authRouter.route('/login').post(handlerLogin);
authRouter.route('/logout').post(verifyToken, handlerLogOut);

export { authRouter }