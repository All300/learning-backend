import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.models"
import { ApiError } from "../utils/ApiError"
import { ApiResponse } from "../utils/ApiResponse"
import { asyncHandler } from "../utils/asyncHandler"

const toggleVideoLike = asyncHandler(async(req, res) => {
    const{videoId} = req.params

    if(!isValidObjectId(videoId)) throw new ApiError(401, "invalid videoId")

    const videoLike = await Like.findOne({
        $and: [{ likedBy: req.user?._id }, { video: videoId }]
    })

    if(videoLike) {
        const unlike = await Like.findByIdAndDelete(videoLike._id)

        if(!unlike) throw new ApiError(500, "something went wrong like cannot be removed")

        return res
        .status(200)
        .json(new ApiResponse(200, unlike, "Like removed"))
    }

    const like = await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    if(!like) throw new ApiError(500, "something went wrong like cannot be added")


    return res
    .status(200)
    .json(new ApiResponse(
        200,
        like,
        "like added"
    ))
})

const toggleCommentLike = asyncHandler(async(req, res) => {
    const {commentId} = req.params
    
    if(!isValidObjectId(commentId)) throw new ApiError(401, "Invalid CommentId")

    const commentLike = await Like.findOne({
        $and: [ {likedBy: req.user?._id}, {comment: commentId} ]
    })

    if(commentLike){
        const unlike = await Like.findByIdAndDelete(commentLike._id)

        if(!unlike) throw new ApiError(500, "something went wrong like cannot be removed")

        return res.status(200).json(new ApiResponse(200, unlike, "like removed"))
    }

    const like = await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    if(!like) throw new ApiError(500, "something went wrong like cannot be added")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        like,
        "like added"
    ))
})

const toggleTweetLike = asyncHandler(async(req, res) => {
    const {tweetId} = req.params

    if(!isValidObjectId(tweetId)) throw new ApiError(401, "Invalid TweetId")

    const tweetLike = await Like.findOne({
        $and: [ {likedBy: req.user?._id}, {tweet: tweetId}]
    })

    if(tweetLike){
        const unlike = await Like.findByIdAndDelete(tweetLike._id)

        if(!unlike) throw new ApiError(500, "something went wrong like cannot be removed")

        return res.status(200).json(new ApiResponse(200, unlike, "Like removed"))
    }

    const like = await Like.create({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if(!like) throw new ApiError(500, "something went wrong like cannot be added")

    return res
    .status(200)
    .json(new ApiResponse(

    ))
})

const getLikedVideos = asyncHandler(async(req, res) => {

    const likedVideos = Like.find({
        $and: [{likedBy: req.user?._id}, {video: {$exists: true}}]
    })

    if(!likedVideos) throw new ApiError(401," liked videos not found")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        { "Total_Videos": likedVideos.length, "Videos": likedVideos}, 
        "Videos found!"
    ))
})
export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}