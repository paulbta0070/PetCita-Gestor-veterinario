import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import healthRouter from "./health";
import petcitaRouter from "./petcita";

const router: IRouter = Router();

router.use(healthRouter);
router.use((req, res, next) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Debes iniciar sesión para acceder a PetCita" });
    return;
  }
  next();
});
router.use(petcitaRouter);

export default router;
