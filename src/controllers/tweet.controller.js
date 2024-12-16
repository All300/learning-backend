import { Tweet } from "../models/tweet.models.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { isValidObjectId } from "mongoose"

const createTweet = asyncHandler(async(req, res) => {
    const {content} = req.body
    const {user} = req.user
    if(!content) throw new ApiError(401, "Enter something to tweet")
    
    if(!user) throw new ApiError(401, "Please login to post tweet")

    const postTweet = await Tweet.create({
        content,
        owner: req.user?._id
    })
    
    if(!postTweet) return new ApiError(500, "something went wrong. Tweet couldn't be posted")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        postTweet,
        "tweet posted successfullyu"
    ))
})

const getUserTweets = asyncHandler(async(req, res) => {

    const {userId} = req.params

    if(!isValidObjectId(userId)) throw new ApiError(401, "Invalid userId")

    const userTweets = Tweet.find({
        owner: userId
    })


    if(userTweets.length === 0) return new ApiError(401, "no tweets found")
    
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {"Total_tweets": userTweets.length, "Tweet": userTweets},
        "Tweets found successfully"
    ))
})

const updateTweet = asyncHandler(async(req, res) => {
    const {tweetId} = req.params
    const {newContent} = req.body

    if(!isValidObjectId(tweetId)) throw new ApiError(401, "Invalid tweetId")
    if(!newContent) throw new ApiError(401, "Enter content to update")

    const findTweet = await Tweet.findById(tweetId)

    if(!findTweet) throw new ApiError(401, "No such tweet exists")

    if(req.user?._id !== findTweet.owner) throw new ApiError(401, "You are not authorized to edit the tweet")

    findTweet.content = newContent
    const updatedTweet = await findTweet.save({validateBeforeSave: false})

    if(!updatedTweet) throw new ApiError(500, "something went wrong. Tweet could not be updated")
    
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        updatedTweet,
        "Tweet updated successfully"
    ))
})

const deleteTweet = asyncHandler(async(req, res) => {

    const {tweetId} = req.params
    
    if(!isValidObjectId(tweetId)) throw new ApiError(401, "Invalid tweetId")

    const delTweet = await Tweet.deleteOne({
        $and: [{owner: req.user?._id}, {_id: tweetId}]
    })

    if(!delTweet) throw new ApiError(401, "No such tweet exists")

    if(delTweet.deletedCount === 0) return res.status(401).json(new ApiError(401, "You are not authorized to delete the comment"))

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        delTweet,
        "Tweet deleted successfully"
    ))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}