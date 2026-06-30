import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id")
    }

    const commentAggregate = Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
    ])

    const options = {
        page : parseInt(page, 10),
        limit : parseInt(limit, 10)
    }

    const comments = await Comment.aggregatePaginate(commentAggregate, options)
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,"Comments successfully fetched", comments
        )
    )

})

const addComment = asyncHandler(async (req, res) => {
    const {content} = req.body
    const userId = req.user._id
    const {videoId} = req.params

    if(!content || content?.trim() === ""){
        throw new ApiError(
            400,
            "Comment cannot be empty"
        )
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(
            404,
            "Video does not exist"
        )
    }

    const comment = await Comment.create({
        content,
        video : videoId,
        owner : userId
    })

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            "Comment Successfully Posted",
            comment
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if(!content || content?.trim() === ""){
        throw new ApiError(400, "Comment cannot be empty")
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404,"Comment does not exist")
    }

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"User not authorized to update this comment")
    }


    comment.content = content
    await comment.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Comment Updated", comment)
    )
}) 

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404,"Comment does not exist")
    }

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "User not authorized to delete this comment")
    } 

    await Comment.findByIdAndDelete(commentId)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,"Comment Successfully Deleted"
        )
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}