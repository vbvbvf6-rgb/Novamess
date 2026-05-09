import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import contactsRouter from "./contacts";
import chatsRouter from "./chats";
import messagesRouter from "./messages";
import callsRouter from "./calls";
import giftsRouter from "./gifts";
import storiesRouter from "./stories";
import postsRouter from "./posts";
import adminRouter from "./admin";
import aiRouter from "./ai";
import eventsRouter from "./events";
import walletRouter from "./wallet";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(contactsRouter);
router.use(chatsRouter);
router.use(messagesRouter);
router.use(callsRouter);
router.use(giftsRouter);
router.use(storiesRouter);
router.use(postsRouter);
router.use(adminRouter);
router.use(aiRouter);
router.use(eventsRouter);
router.use(walletRouter);

export default router;
