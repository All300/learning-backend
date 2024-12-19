import mongoose, { isValidObjectId } from "mongoose"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Comment } from "../models/comment.models.js"
import { Video } from "../models/video.models.js"

const getVideoComments = asyncHandler(async(req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!videoId || !isValidObjectId(videoId)) throw new ApiError(401, "Invalid videoId")

    if(!query || !query.trim() === "") throw new ApiError(401, "Query is required")

    const getComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            _id: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                foreignField: "comment",
                localField: "_id",
                as: "likes"
            }
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likes"
                }
            }
        },
        {
            $project: {
                _id: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
                content: 1,
                owner: 1,
                likesCount: 1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: parseInt(limit)
        }
    ])

    if(!getComments || getComments.length === 0) throw new ApiError(404, "No comments found") 

    return res
    .status(200)
    .json(new ApiResponse(
        200, 
        getComments,
        "Comments fetched successfully"
    ))
})

const addComment = asyncHandler(async(req, res) => {
    const {content} = req.body
    const {videoId} = req.params
    const {user} = req.user
    
    if(!content) {
        throw new ApiError(401, "Enter something in comment")
    }

    if(!user) {
        throw new ApiError(401, "Please login to comment")
    }

    if(!videoId || !isValidObjectId(videoId)) throw new ApiError(401, "Invalid videoId")

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(401, "No such video exixts")
    }

    const comment = await Comment.create({
        content,
        video: video._id,
        owner: user._id
    })

    if(!comment){
        throw new ApiError(500, "Error while adding the comment")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        comment,
        "comment added"
    ))
})

const updateComment = asyncHandler(async(req, res) => {
    const {commentId} = req.params
    const {newContent} = req.body

    if(!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(401, "Invalid commentId")
    }

    if(!newContent) {
        throw new ApiError(401, "enter the comment")
    }

    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(401, "No such comment exists")
    }

    if(comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(401, "Only owner can edit the comment")
    }

    comment.content = newContent
    const updatedComment = await comment.save({validateBeforeSave: false})

    if(!updatedComment) throw new ApiError(500, "something went wrong while updating the comment")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        updatedComment,
        "Comment edited successfully"
    ))

})

const deleteComment = asyncHandler(async(req, res) => {
    const{ commentId } = req.params

    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(401, "Invalid commentId")
    }

    const delComment = await Comment.deleteOne({
        $and: [{_id: commentId}, 
            {owner: req.user?._id}]
    })

    if(!delComment) {
        throw new ApiError(401, "Comment not found")
    }

    if(delComment.deletedCount == 0) {return res.status(401).json(new ApiError(401, "You are not authorized to delete the comment"))}

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        delComment,
        "Comment deleted successfully"
    ))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}