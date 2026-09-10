import { Router, type IRouter } from "express";
import healthRouter from "./health";
import petcitaRouter from "./petcita";

const router: IRouter = Router();

router.use(healthRouter);
router.use(petcitaRouter);

export default router;
