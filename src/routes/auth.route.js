import { Router } from "express";
import { signup } from "../controller/auth.controller.js";
const authRouter = Router();


authRouter.route('/signup').get(signup);


export { authRouter }