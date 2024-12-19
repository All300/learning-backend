import { isValidObjectId } from "mongoose"
import { Like } from "../models/like.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import {Video} from "../models/video.models.js"
import { Tweet } from "../models/Tweet.models.js"
import { Comment } from "../models/comment.models.js"

const toggleVideoLike = asyncHandler(async(req, res) => {
    const{videoId} = req.params

    if(!videoId || !isValidObjectId(videoId)) throw new ApiError(401, "invalid videoId")

    const video = await Video.findById(videoId)

    if(!video) throw new ApiError(404,"Video not found")

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
    else {
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
    }
})

const toggleCommentLike = asyncHandler(async(req, res) => {
    const {commentId} = req.params
    
    if(!commentId || !isValidObjectId(commentId)) throw new ApiError(401, "Invalid CommentId")

    const comment = await Comment.findById(commentId)

    if(!comment) throw new ApiError(404, "Comment not found")

    const commentLike = await Like.findOne({
        $and: [ {likedBy: req.user?._id}, {comment: commentId} ]
    })

    if(commentLike){
        const unlike = await Like.findByIdAndDelete(commentLike._id)

        if(!unlike) throw new ApiError(500, "something went wrong like cannot be removed")

        return res.status(200).json(new ApiResponse(200, unlike, "like removed"))
    }
    else {
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
    }
})

const toggleTweetLike = asyncHandler(async(req, res) => {
    const {tweetId} = req.params

    if(!tweetId || !isValidObjectId(tweetId)) throw new ApiError(401, "Invalid TweetId")

    const tweet = await Tweet.findById(tweetId)

    if(!tweet) throw new ApiError(404, "Tweet not found")

    const tweetLike = await Like.findOne({
        $and: [ {likedBy: req.user?._id}, {tweet: tweetId}]
    })

    if(tweetLike){
        const unlike = await Like.findByIdAndDelete(tweetLike._id)

        if(!unlike) throw new ApiError(500, "something went wrong like cannot be removed")

        return res.status(200).json(new ApiResponse(200, unlike, "Like removed"))
    }
    else {
        const like = await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        })
    
        if(!like) throw new ApiError(500, "something went wrong like cannot be added")
    
        return res
        .status(200)
        .json(new ApiResponse(
            200, 
            like,
            "Like added"
        ))
    }
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