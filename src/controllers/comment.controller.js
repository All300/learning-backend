import mongoose, { isValidObjectId } from "mongoose"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"
import { Comment } from "../models/comment.models"
import { Video } from "../models/video.models"

const getVideoComments = asyncHandler(async(req, res) => {
    
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
        throw new ApiError(500, "Error while saving the comment")
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

    if(!isValidObjectId(commentId)) {
        throw new ApiError(401, "Enter the valid comment id")
    }

    if(!newContent) {
        throw new ApiError(401, "enter the comment")
    }

    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(401, "No such comment exists")
    }

    if(req.user?._id !== comment.owner) {
        throw new ApiError(401, "Only owner can edit the comment")
    }

    comment.content = newContent
    await comment.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        comment,
        "Comment edited successfully"
    ))

})

const deleteComment = asyncHandler(async(req, res) => {
    const{ commentId } = req.params

    if(!isValidObjectId(commentId)){
        throw new ApiError(401, "Enter valid comment Id")
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