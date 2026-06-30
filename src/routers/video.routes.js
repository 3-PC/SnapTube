import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

import { publishAVideo, updateVideo, deleteVideo } from "../controllers/video.controller.js";

const router = Router()

router.use(verifyJWT)

router.route("/").post(
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

router.route("/:videoId")
.post(
    upload.single("thumbnail"),
    updateVideo
)
.delete(deleteVideo)

export default router