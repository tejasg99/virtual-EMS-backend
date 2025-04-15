import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import eventRoutes from "./event.routes.js";

const router = Router();

//base paths for each router
const routes = [
    { path: '/auth', route: authRoutes }, 
    { path: '/users', route: userRoutes }, 
    { path: '/events', route: eventRoutes },
]

//Mount each router
routes.forEach((route) => {
    router.use(route.path, route.route);
});

export default router;