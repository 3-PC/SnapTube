import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { attemptAuth } from "../middleware/attemptauth.middleware.js";

import { publishAVideo, updateVideo, deleteVideo, getVideoById, togglePublishStatus, getAllVideos} from "../controllers/video.controller.js";

const router = Router()

router.route("/").post(
    verifyJWT,
    upload.fields([
        {
            name : "video", maxCount : 1
        },
        {
            name : "thumbnail", maxCount : 1
        }
    ]),
    publishAVideo
)

router.route("/channel/:userId")
.get(attemptAuth, getAllVideos)

router.route("/:videoId")
.post(
    verifyJWT,
    upload.single("thumbnail"),
    updateVideo
)
.delete(
    verifyJWT, 
    deleteVideo
)
.get(
    attemptAuth, 
    getVideoById
) 
.patch(
    verifyJWT, 
    togglePublishStatus
)



export default router