import { Router } from "express";
import {
    handlerAllEvents,
    handlerPerticularEvent,
    handlerFilterInput,
    handlerPins,
    handlerAllPinedEvents,
    handlerLike,
    handlerAddComment,
    handlerFindEventComment,
    handlerDeleteComment,
    handlerEditComment
} from "../controller/userEvents.controller.js";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
import { verifyRole } from "../middleware/verifyRole.middleware.js";
const userOwner = Router();

userOwner.route('/getallevents').get(verifyToken, verifyRole(["user"]), handlerAllEvents)
userOwner.route('/getparticularevent/:id').get(verifyToken, verifyRole(["user"]), handlerPerticularEvent)
userOwner.route('/filterevents').get(verifyToken, verifyRole(["user"]), handlerFilterInput)
userOwner.route('/pinevent/:id').post(verifyToken, verifyRole(["user"]), handlerPins)
userOwner.route('/allpinevent').get(verifyToken, verifyRole(["user"]), handlerAllPinedEvents)
userOwner.route('/likeevent/:id').post(verifyToken, verifyRole(["user"]), handlerLike)
userOwner.route('/addcommnet/:id').post(verifyToken, verifyRole(["user"]),handlerAddComment)
userOwner.route('/eventcomment/:id').get(verifyToken, verifyRole(["user"]),handlerFindEventComment)
userOwner.route('/deletecomment/:id').delete(verifyToken, verifyRole(["user"]),handlerDeleteComment)
userOwner.route('/editcomment/:id').patch(verifyToken, verifyRole(["user"]),handlerEditComment)

export { userOwner };