import { Playlist } from "../models/playlist.models.js"
import { Video } from "../models/video.models.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose, { isValidObjectId } from "mongoose"

const createPlaylist = asyncHandler(async(req, res) => {

    const {name, description} = req.body

    if(!name || name.trim() === "") throw new ApiError(401, "Name is required")

    const playlist = await Playlist.create({
        name,
        description: description || "",
        owner: req.user?._id
    })

    if(!playlist) throw new ApiError(500, "something went wrong while creating playlist")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        playlist,
        "Playlist created successfully"
    ))
})

const getUserPlaylists = asyncHandler(async(req, res) => {

    const {userId} = req.params

    if(!userId || !isValidObjectId(userId)) throw new ApiError(401, "Invalid userId")

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        }
    ])

    if(!playlists.length) return res.status(404).json(new ApiResponse(404, {}, "No playlist found for this user"))

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        playlists,
        "playlist fetched succesfully"
    ))
})

const getPlaylistById = asyncHandler(async(req, res) => {

    const { playlistId } = req.params

    if(!playlistId || !isValidObjectId(playlistId)) throw new ApiError(401, "Invalid playlistId")

    const playlist = await Playlist.findById(playlistId)

    if(!playlist) throw new ApiError(500, "Error while fetching playlist")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        playlist,
        "playlist fetched successfully"
    ))
})

const addVideoToPlaylist = asyncHandler(async(req, res) => {

    const {playlistId, videoId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)) throw new ApiError(401, "Invalid PlaylistId")

    if(!videoId || !isValidObjectId(videoId)) throw new ApiError(401, "Invalid VideoId")

    const playlist = await Playlist.findById(playlistId)

    if(!playlist) throw new ApiError(404, "Playlist not found")

    const video = await Video.findById(videoId)

    if(!video) throw new ApiError(404, "Video not found")

    if(playlist?.owner.toString() !== req.user?._id.toString()) throw new ApiError(401, "You are not authorized to add the video in playlist")

    if(playlist.videos.includes(videoId)) return res.status(200).json(new ApiResponse(200, {}, "Video already in playlist"))

    const addToPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId
            }
        },
        {new: true}
    )

    if(!addToPlaylist) throw new ApiError(500, "Error while addinh video to the playlist")
    

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        addToPlaylist,
        "Video added to playlist successfully"
    ))
})

const removeVideoFromPlaylist = asyncHandler(async(req, res) => {

    const {videoId, playlistId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)) throw new ApiError(401, "Invalid PlaylistId")

    if(!videoId || !isValidObjectId(videoId)) throw new ApiError(401, "Invalid VideoId")

    const playlist = await Playlist.findById(playlistId)

    if(!playlist) throw new ApiError(404, "Playlist not found")

    const video = await Video.findById(videoId) 

    if(!video) throw new ApiError("Video not found")

    if(playlist?.owner.toString() !== req.user?._id.toString()) throw new ApiError(401, "You are not authorized to remove video from the playlist")

    if(!playlist.videos.includes(videoId)) throw new ApiError(404, "Video not found in the playlist")

    const removeVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                $videos: {
                    $in: [`${videoId}`]
                }
            }
        },
        {new: true}
    )

    if(!removeVideo) throw new ApiError(500, "something went wrong while removing video from playlist")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        removeVideo,
        "Video removed from playlist successfully"
    ))
})

const deletePlaylist = asyncHandler(async(req, res) => {

    const{playlistId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)) throw new ApiError(401, "Invalid playlistId")

    const playlist = await Playlist.findById(playlistId)

    if(!playlist) throw new ApiError(404, "No playlist found")

    if(playlist?.owner.toString() !== req.user?._id.toString()) throw new ApiError(401, "You are not authorized to delete the playList")

    const delPlaylist = await Playlist.findByIdAndDelete(playlistId)

    if(!delPlaylist) throw new ApiError(500, "Something went wrong while deleting the playlist")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        delPlaylist,
        "Playlist deleted successfully"
    ))
})

const updatePlaylist = asyncHandler(async(req, res) => {

    const {playlistId} = req.params
    const {newName, newDescription} = req.body

    if(!playlistId || !isValidObjectId(playlistId)) throw new ApiError(401, "Invalid playlistId")

    const playlist = await Playlist.findById(playlistId)

    if(!playlist) throw new ApiError(404, "Playlist not found")

    if(playlist?.owner.toString() !== req.user?._id.toString()) throw new ApiError(401, "You are not authorized to update the playlist")

    if(!newName || newName.trim() === "") throw new ApiError("Name is required")

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: newName,
                description: newDescription || Playlist?.description
            }
        },
        {new: true}
    )

    if(!updatedPlaylist) throw new ApiError(500, "something went wrong while updating the playlist")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        updatedPlaylist,
        "Playlist updated successfully"
    ))
})

export{
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}