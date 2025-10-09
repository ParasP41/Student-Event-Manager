import { Router } from "express";
import { handlerAddEvent, handlerDeleteEvent, handlerUpdateEvent, handlerOwnerEvents, handlerFindOneOwnerEvent,handlerFilterInput } from '../controller/ownerEvent.controller.js'
import { verifyRole } from "../middleware/verifyRole.middleware.js";
import { verifyToken } from "../middleware/verifyToken.middleware.js";
import { upload } from '../middleware/multer.middleware.js'
const ownerEvent = Router();


ownerEvent.route("/addevent").post(verifyToken, verifyRole(["owner"]), upload.single('bannerImage'), handlerAddEvent);
ownerEvent.route("/deleteeevent/:id").delete(verifyToken, verifyRole(["owner"]), handlerDeleteEvent);
ownerEvent.route("/update/:id").patch(verifyToken, verifyRole(["owner"]), upload.single('bannerImage'), handlerUpdateEvent);

ownerEvent.route("/allownerevents").get(verifyToken, verifyRole(["owner"]), handlerOwnerEvents);
ownerEvent.route("/findoneownerevents/:id").get(verifyToken, verifyRole(["owner"]), handlerFindOneOwnerEvent);
ownerEvent.route("/filterevents").get(verifyToken,verifyRole(["owner"]),handlerFilterInput);

export { ownerEvent };