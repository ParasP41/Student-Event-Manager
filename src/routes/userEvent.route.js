import { Router } from "express";
import {
    handlerAllEvents,
    handlerPerticularEvent,
    handlerFilterInput,
    handlerPins,
    handlerAllPinedEvents,
    handlerLike
} from "../controller/userEvents.controller.js";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
import { verifyRole } from "../middleware/verifyRole.middleware.js";
const userOwner = Router();

userOwner.route('/getallevents').get(verifyToken, verifyRole(["user"]), handlerAllEvents)
userOwner.route('/getparticularevent/:id').get(verifyToken, verifyRole(["user"]), handlerPerticularEvent)
userOwner.route('/filterevents').get(verifyToken, verifyRole(["user"]), handlerFilterInput)
userOwner.route('/pinevent/:id').post(verifyToken, verifyRole(["user"]), handlerPins)
userOwner.route('/allpinevent').get(verifyToken, verifyRole(["user"]), handlerAllPinedEvents)
userOwner.route('/likeevent/:id').get(verifyToken, verifyRole(["user"]), handlerLike)

export { userOwner };