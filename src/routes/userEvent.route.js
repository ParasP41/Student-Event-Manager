import { Router } from "express";
import { handlerAllEvents, handlerPerticularEvent, handlerFilterInput } from "../controller/userEvents.controller.js";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
import { verifyRole } from "../middleware/verifyRole.middleware.js";
const userOwner = Router();

userOwner.route('/getallevents').get(verifyToken, verifyRole(["user"]), handlerAllEvents)
userOwner.route('/getparticularevent/:id').get(verifyToken, verifyRole(["user"]), handlerPerticularEvent)
userOwner.route('/filterevents').get(verifyToken, verifyRole(["user"]), handlerFilterInput)

export { userOwner };