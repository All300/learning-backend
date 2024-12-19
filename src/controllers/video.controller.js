import { Video } from "../models/video.models.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js"
import { isValidObjectId } from "mongoose"
import { response } from "express"
import { Comment } from "../models/comment.models.js"
import { Like } from "../models/like.models.js"
import { User } from "../models/user.models.js"

const getAllVideos = asyncHandler(async(req, res) => {

    const {page = 1, limit = 10, query, sortBy, sortType, userId} = req.query

    if(!query || query.trim() === "") throw new ApiError(401, "Query is required")

    const videos = await Video.aggregate([
        {
            $match: {
                $or: [
                    {
                        title: {$regex: query, $options: "i"}
                    },
                    {
                        description: {$regex: query, $options: "i"}
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                owner: 1,
                _id: 1,
                title: 1,
                description: 1,
                views: 1,
                duration: 1,
                isPublished: 1
            }
        },
        {
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: parseIn(limit)
        }
    ])

    if(!videos.length) throw new ApiError("No videos found from given query")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        videos,
        "Videos fetched successfully"
    ))
})

const publishVideo = asyncHandler(async(req, res) => {

    const {title, description} = req.body
    const {user} = req.user

    if(!user) throw new ApiError(401, "Login to upload a video")

    if([title, description].some(fields => fields.trim() === "")) throw new ApiError(401, "Ttile and description are required")

    try {
        const videoFileLocalPath = req.files.videoFile[0]?.path

        const thumbmailLocalPath = req.files.thumbnail[0]?.path

        if(!videoFileLocalPath) throw new ApiError(401, "Video file local path is required")

        if(!thumbmailLocalPath) throw new ApiError(401, "Thumbnail file local path is required")

        const videoFile = await uploadOnCloudinary(videoFileLocalPath)

        const thumbnail = await uploadOnCloudinary(thumbmailLocalPath)

        if(!videoFile) throw new ApiError(401, "Video file is required")

        if(!thumbnail) throw new ApiError(401, "Thumbnail file is required")

        const video = await Video.create({
            title,
            description,
            thumbnail: thumbnail.url,
            videoFile: videoFile.url,
            duration: videoFile.duration,
            owner: req.user?._id,
            isPublished: true
        })

        if(!video) throw new ApiError(500, "Error while uploading video")

            return res
            .status(200)
            .json(new ApiResponse(
                200,
                video,
                "Video uploaded successfully"
            ))

    }catch(error) {
        throw new ApiError(500, "Error while uploading the video", error)
    }
})

const getVideoById = asyncHandler(async(req, res) => {

    const { videoId } = req.params

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid VideoId");
    }

    const video = await Video.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(videoId) // Convert string to ObjectId
                }
            },

            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes"
                },
            },

            {
                $addFields: {
                    likesCount: {
                        $size: "$likes"
                    },

                    isLiked: {
                        $cond: {
                            if: {$in: [req.user?._id, "$likes.likedBy"]},
                            then: true,
                            else: false,
                        }
                    }
                }
            },

            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "owner",
                    as: "owner",
                    pipeline: [
                        {
                            $lookup: {
                                from: "subscriptions",
                                foreignField: "channel",
                                localField: "_id",
                                as: "subscribers"
                            }
                        },

                        {
                            $addFields: {
                                subscriberCount: {
                                    $size: "$subscribers"
                                },

                                isSubscribed: {
                                    $cond: {
                                        if: {$in : [req.user?._id, "$subscribers.subscriber"]},
                                        then: true,
                                        else: false
                                    }
                                }
                            }
                        },

                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1,
                                subscriberCount: 1,
                                isSubscribed: 1,
                            },
                        }
                    ]
                },


            },

            {
                $lookup: {
                    from: "comments",
                    foreignField: "video",
                    localField: "_id",
                    as: "comments"
                }
            },

            {
                $project: {
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    owner: 1,
                    createdAt: 1,
                    comments: 1,
                    likesCount: 1,
                    isLiked: 1,
                }
            }
        ]
    );


    if(!video) {
        throw new ApiError(404, "Video is not found")
    }

    const videoViews = await Video.findByIdAndUpdate(
        videoId, 
        {
            $inc: {views: 1}
        },

        {
            new: true
        }
    );

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
           $addToSet: {watchHistory: videoId}
        },

        {
            new: true
        }
    );

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {
            video: video[0],
            videoViews: videoViews,
            user: user
        },
        "Video fetched successfully"
    ))
})

const updateVideo = asyncHandler(async(req, res) => {

    const {videoId} = req.params
    const {title, description} = req.body

    if(!videoId || !isValidObjectId(videoId)) throw new ApiError(401, "Invalid videoId")

    if(!(title || description)) throw new ApiError(401, "Title or description is required")

    const newThumbnailLocalPath = req.file?.path

    if(!newThumbnailLocalPath) throw new ApiError(401, "Thumbnail file path is required")
    
    const thumbnail = await uploadOnCloudinary(newThumbnailLocalPath)

    if(!thumbnail) throw new ApiError(500, "Error while uploading on cloudinary")

    const oldVideo = await Video.findById(videoId)

    if(!oldVideo) throw new ApiError(404, "Video not found")

    if(req.user?._id !== oldVideo.owner) throw new ApiError(401, "You are not authorized to update the video")

    oldThumbnail_public_id = oldVideo.thumbnail

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail.url
            }
        },
        {
            new: true
        }
    )

    await deleteOnCloudinary(oldThumbnail_public_id).then((res) => {
        console.log("Deletion response: ", response)
        return new ApiResponse(200, {}, "Old file has been deleted")
    }).catch((error) => {
        console.error("Deletion failed: ", error)
        throw new ApiError(400, "Error deleting the old file from cloudinary")
    })
    
    
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        video,
        "Video has been successfully updated"
    ))
})

const deleteVideo = asyncHandler(async(req, res) => {

    const {videoId} = req.params

    if(!videoId || !isValidObjectId(videoId)) throw new ApiError(401, "Invalid videoId")

    const video = await Video.findById(videoId)

    if(!videoId) throw new ApiError(404, "Video not found")

    const videoFile_public_id = video.videoFile
    const thumbnail_public_id = video.thumbnail
    const owner = video.owner

    const delVideo = await Video.findByIdAndDelete(videoId)

    if(!delVideo) throw new ApiError(500, "Error while deleting the video")

    await Comment.deleteMany({video: videoId})

    await Like.deleteMany({video: videoId})

    await User.updateMany(
        { watchHistory: videoId},
        { $pull: {watchHistory: videoId }}
    )

    const delVideoFile = await deleteOnCloudinary(videoFile_public_id).then(response => {
        console.log("Deletion response: ", response)
    })
    .catch(error => {
        console.log("Deletion failed: ", error)
    })

    const delThumbnail = await deleteOnCloudinary(thumbnail_public_id).then(response => {
        console.log("Deletion response: ", response)
    })
    .catch(error => {
        console.log("Deletion failed", error)
    })

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {delVideo, delVideoFile, delThumbnail},
        "Video successfully deleted"
    ))
})

const togglePublishStatus = asyncHandler(async(req, res) => {

    const {videoId} = req.params

    if(!videoId || !isValidObjectId(videoId)) throw new ApiError(401, "Invalid videoId")

    const video = await Video.findById(videoId)

    if(!video) throw new ApiError(404, "Video not found")

    const toggleStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        toggleStatus,
        "Status is updated successfully"
    ))
})

export {
    getAllVideos,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}