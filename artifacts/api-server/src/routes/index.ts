import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import contactsRouter from "./contacts";
import chatsRouter from "./chats";
import messagesRouter from "./messages";
import callsRouter from "./calls";
import giftsRouter from "./gifts";
import storiesRouter from "./stories";
import postsRouter from "./posts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(contactsRouter);
router.use(chatsRouter);
router.use(messagesRouter);
router.use(callsRouter);
router.use(giftsRouter);
router.use(storiesRouter);
router.use(postsRouter);

export default router;
