import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import qrAuthRouter from "./qr-auth";
import usersRouter from "./users";
import contactsRouter from "./contacts";
import chatsRouter from "./chats";
import messagesRouter from "./messages";
import callsRouter from "./calls";
import storiesRouter from "./stories";
import postsRouter from "./posts";
import adminRouter from "./admin";
// import aiRouter from "./ai"; // AI feature disabled
import eventsRouter from "./events";
import walletRouter from "./wallet";
import botsRouter from "./bots";
import supportRouter from "./support";
import primeRouter from "./prime";
import pushRouter from "./push";
import pollsRouter from "./polls";
import translateRouter from "./translate";
import referralRouter from "./referral";
import foldersRouter from "./folders";
import platformEventsRouter from "./platform-events";
import contactRequestsRouter from "./contact-requests";
import clansRouter from "./clans";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(qrAuthRouter);
router.use(usersRouter);
router.use(contactsRouter);
router.use(chatsRouter);
router.use(messagesRouter);
router.use(callsRouter);
router.use(storiesRouter);
router.use(postsRouter);
router.use(adminRouter);
// router.use(aiRouter); // AI feature disabled
router.use(eventsRouter);
router.use(walletRouter);
if (!process.env.DISABLE_BOTS) router.use(botsRouter);
router.use(supportRouter);
router.use(primeRouter);
router.use(pushRouter);
router.use(pollsRouter);
router.use(translateRouter);
router.use(referralRouter);
router.use(foldersRouter);
router.use(platformEventsRouter);
router.use(contactRequestsRouter);
router.use(clansRouter);

export default router;
