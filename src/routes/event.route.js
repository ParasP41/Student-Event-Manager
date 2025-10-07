import { Router } from "express";
import { handlerDemo } from "../controller/event.controller.js";
const eventRouter = Router();

eventRouter.route("/get").get(handlerDemo);


export { eventRouter };