import { Router } from "express";
import { handlerAddEvent } from '../controller/ownerEvent.controller.js'
import { verifyRole } from "../middleware/verifyRole.middleware.js";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
const ownerEvent = Router();


ownerEvent.route("/get").get(verifyToken,verifyRole(["owner"]),handlerAddEvent);


export { ownerEvent };