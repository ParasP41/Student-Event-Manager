import { Router } from "express";
import {
    handlerSignUp,
    handlerLogin,
    handlerLogOut,
    handlerUpdateProfile,
    handlerUpdatePassword,
    handlerSentOTP,
    handlerVerifyAndUpdatePassword
} from "../controller/auth.controller.js";
import { verifyToken } from '../middleware/verifyToken.middleware.js'
import { upload } from '../middleware/multer.middleware.js'
const authRouter = Router();


authRouter.route('/signup').post(handlerSignUp);
authRouter.route('/login').post(handlerLogin);
authRouter.route('/logout').post(verifyToken, handlerLogOut);
authRouter.route('/updateprofile').patch(verifyToken, upload.single('picture'), handlerUpdateProfile);
authRouter.route('/updatepassword').patch(verifyToken, handlerUpdatePassword);
authRouter.route('/sendotp').post(verifyToken, handlerSentOTP);
authRouter.route('/verifyandupdatepassword').patch(verifyToken, handlerVerifyAndUpdatePassword);

export { authRouter }