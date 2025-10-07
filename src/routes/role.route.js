import { Router } from "express";
import { handlerOwnerRoleSwitch,handlerUserRoleSwitch } from "../controller/role.controller.js";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
const roleRouter = Router();

roleRouter.route("/ownerroleswitch").post(verifyToken, handlerOwnerRoleSwitch);
roleRouter.route("/userroleswitch").post(verifyToken, handlerUserRoleSwitch);


export { roleRouter }