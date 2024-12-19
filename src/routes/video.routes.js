import { Router } from "express";
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishVideo,
    togglePublishStatus,
    updateVideo,
} from "../controllers/video.controller.js"
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.milddleware.js";

const router = Router()
router.use(verifyJwt)

router.route("/")
.get(getAllVideos)
.post(
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishVideo
)

router.route("/:videoId").get(getVideoById).delete(deleteVideo).patch(upload.single("thumbmail"), updateVideo)
router.route("/toggle/piblish/:videoId").patch(togglePublishStatus)

export default router