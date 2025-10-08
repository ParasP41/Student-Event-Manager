import { Router } from "express";
import { handlerAddEvent, handlerDeleteEvent,handlerUpdateEvent } from '../controller/ownerEvent.controller.js'
import { verifyRole } from "../middleware/verifyRole.middleware.js";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
const ownerEvent = Router();


ownerEvent.route("/addevent").post(verifyToken, verifyRole(["owner"]), handlerAddEvent);
ownerEvent.route("/delete/:id").delete(verifyToken, verifyRole(["owner"]), handlerDeleteEvent);
ownerEvent.route("/update/:id").patch(verifyToken, verifyRole(["owner"]), handlerUpdateEvent);


export { ownerEvent };