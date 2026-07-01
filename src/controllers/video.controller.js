import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import { User } from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler} from "../utils/asyncHandler.js"
import {uploadToCloudinary} from "../utils/cloudinary.js"
import { fileTypeFromFile } from "file-type"
import { deleteFromCloudinary } from "../utils/deleteFromCloudinary.js"
import fs from "fs"
import { validateHeaderName } from "http"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc"} = req.query
    const { userId } = req.params

    if(!mongoose.isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id")
    }

    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(404, "User not found")
    }

    const matchCriteria = {
        owner : new mongoose.Types.ObjectId(userId)
    }

    if(userId.toString() !== req.user?._id?.toString()){
        matchCriteria.isPublished = true
    }

    const videoAggregate = Video.aggregate([
        {
            $match : matchCriteria
        },
        {
            $sort : {
                [sortBy] : sortType === "asc" ? 1 : -1
            }
        }
    ])

    const options = {
        page : parseInt(page, 10),
        limit : parseInt(limit, 10)
    }

    const videos = await Video.aggregatePaginate(videoAggregate, options)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            "Video Successfully fetched",
            videos
        )
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body
    const videoLocalPath = req.files?.video?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if(!videoLocalPath){
        throw new ApiError(400, "Video file is required")
    }

    const type = await fileTypeFromFile(videoLocalPath)

    if(!type || !type.mime.startsWith("video/")){
        fs.unlinkSync(videoLocalPath)
        throw new ApiError(400, "Uploaded file is not a video")
    }

    const video = await uploadToCloudinary(videoLocalPath)
    const thumbnail = await uploadToCloudinary(thumbnailLocalPath)

    if(!video.url){
        throw new ApiError(400, "Error while uploading to cloudinary")
    }

    const createdVideo = await Video.create({
        videoFile : video?.url,
        thumbnail : thumbnail?.url,
        title,
        description,
        duration : video?.duration,
        owner : req.user._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Video Successfully Uploaded",
            createdVideo
        )
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Incorrect video id")
    }
    
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video does not exist")
    }

    if(video.owner.toString() !== req.user?._id?.toString() && !video.isPublished){
        throw new ApiError(403, "Not authorized to access this video")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Video successfully fetched",
            video
        )
    )

})

const updateVideo = asyncHandler(async (req, res) => {


    const { videoId } = req.params
    const { title, description} = req.body
    const thumbnailLocalPath = req.file?.path

    if(!title && !description && !thumbnailLocalPath){
        throw new ApiError(
            400,
            "Atleast one field should be changed"
        )
    }
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, "Video not found")
    }

    if(video.owner.toString() !== req.user._id.toString()){
        if(thumbnailLocalPath) fs.unlinkSync(thumbnailLocalPath)
        throw new ApiError(
            403,
            "User not authorized to update video details"
        )
    }

    if(title === video.title && description === video.description){
        if(thumbnailLocalPath) fs.unlinkSync(thumbnailLocalPath)
        throw new ApiError(
            400,
            "Details cannot be same as before"
        )
    }

    if(title) video.title = title
    if(description) video.description = description

    if(thumbnailLocalPath){
        const thumbnail = await uploadToCloudinary(thumbnailLocalPath)
        if(!thumbnail){
            throw new ApiError(
                400,
                "Error while uploading thumbnail"
            )
        }
        video.thumbnail = thumbnail.url
    }

    await video.save({validateBeforeSave : false})
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Video details updated successfully",
            video
        )
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video does not exist")
    }

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "User not authorized to delete the video")
    }

    await deleteFromCloudinary(video.videoFile, "video")
    await deleteFromCloudinary(video.thumbnail, "image")
    
    await Video.findByIdAndDelete(videoId)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Video Successfully deleted"
        )
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video does not exist")
    }

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "Not authorized to update")
    }

    video.isPublished = !video.isPublished

    await video.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Video publish status changed",
            video
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}