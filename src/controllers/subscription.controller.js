import { Subscription } from "../models/subscription.models.js"
import {asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose, { isValidObjectId } from "mongoose"

const toggleSubscription = asyncHandler(async(req, res) =>{

    const {channelId} = req.params

    if(!channelId || !isValidObjectId(channelId)) throw new ApiError(401, "Invalid channelId")

    if(channelId.toString() === req.user?._id.toString()) throw new ApiError(401, "Cannot subscribe your own channel")

    const isSubscribed = await Subscription.findOne({
        subsciber: req.user?._id,
        channel: channelId
    })

    if(isSubscribed){
        const unsubscribe = await Subscription.findByIdAndDelete(isSubscribed)

        if(!unsubscribe) throw new ApiError(500, "something went wrong. Error while unsubscribing")
    }
    else {
        const subscribe = await Subscription.create({
            subsciber: req.user?._id,
            channel: channelId
        })

        if(!subscribe) throw new ApiError(500, "something went wrong. Error while subscribing")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "Subscription toggled"
    ))
})

const getUserChannelSubscribers = asyncHandler(async(req, res) => {

    const {channelId} = req.params

    if(!channelId || !isValidObjectId(channelId)) throw new ApiError(401, "Invalid channelId")

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "subscriber",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                subscibers: {
                    $first: "$subscribers"
                }
            }
        },
        {
            $group: {
                _id: null,
                subscibers: {$push: "$subscribers"},
                totalSubscribers: {$sum: 1}
            }
        },
        {
            $project: {
                _id: 0,
                subscibers: {
                   _id: 1,
                   username: 1,
                   avatar: 1,
                   fullName: 1 
                },
                subscribersCount: "$totalSubscribers"
            }
        }

    ])

    if(!subscribers) throw new ApiError(404, "Subscribers not found")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        subscribers,
        "Subscribers fetched successfully"
    ))
})

const getSubscribedChannels = asyncHandler(async(req, res) => {

    const {subscriberId} = req.params

    if(!subscriberId || !isValidObjectId(subscriberId)) throw new ApiError(401, "Invalid subscriberId")

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "usuers",
                foreignField: "_id",
                localField: "channel",
                as: "channels"
            }
        },
        {
            $addFields: {
                channels: {
                    $first: "$channels"
                }
            }
        },
        {
            $group: {
                _id: null,
                channels: {$push: "$channels"},
                totalChannels: {$sum: 1}
            }
        },
        {
            $project: {
                _id: 0,
                channels: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1
                },
                channelsCount: "$totalChannels"
            }
        }
    ])

    if(!subscribedChannels) throw new ApiError(404, "Channels not found")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully"
    ))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}