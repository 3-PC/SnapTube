import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";
import jwt, { decode } from "jsonwebtoken"
import { upload } from "../middleware/multer.middleware.js";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId)
        const userAccessToken = user.generateAccessToken()
        const userRefreshToken = user.generateRefreshToken()

        user.refreshToken = userRefreshToken
        await user.save({validateBeforeSave : false})

        return {userAccessToken, userRefreshToken}
    }
    catch{
        throw new ApiError(
            500,
            "Something Went Wrong while generating Refresh and Access Token"
        )
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend

    const {fullName, email, username, password } = req.body
    // validation - not empty

    // if(fullName === ""){
    //     throw new apiError(
    //         400,
    //         "Full Name is Required"
    //     )
    // }

    if(
        [fullName, email, username, password].some((field) => {
            return field?.trim() === ""
        })
    ){
        throw new ApiError(
            400,
            "All Fields are required"
        )
    }

    // check if user already exists : via username, email

    const existingUser = await User.findOne({
        $or : [{username}, {email}]
    })

    if(existingUser){
        if(existingUser.username === username.toLowerCase()){
            throw new ApiError(
                409,
                "Username is taken"
            )
        }
        if(existingUser.email === email){
            throw new ApiError(
                409,
                "Email Already in Use"
            )
        }
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path

    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage.path
    }

    if(!avatarLocalPath){
        throw new ApiError(
            400,
            "Avatar Image is Required"
        )
    }

    // upload to cloudinary, check for avatar
    const avatarToCloudinary= await uploadToCloudinary(avatarLocalPath)
    const coverImageToCloudinary = await uploadToCloudinary(coverImageLocalPath)
    
    if(!avatarToCloudinary.url){
        throw new ApiError(409, "Avatar image was not uploaded")
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar : avatarToCloudinary.url,
        username : username.toLowerCase(),
        coverImage : coverImageToCloudinary?.url || "",
        email,
        password
    })

    // remove password and refresh token field from response
    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if(!userCreated){
        throw new ApiError(500, "Something went wrong while registering user")
    }

    // return res if successful
    return res.status(201).json(
        new ApiResponse(
            200,
            "User Registered Successfully",
            userCreated,
        )
    )
})

const loginUser = asyncHandler( async(req, res) => {
    // get data from req

    const {username, email, password} = req.body
    // use username or email to index

    if(!username && !email){
        throw new ApiError(
            400,
            "Username or Email is Required"
        )
    }

    if(!password){
        throw new ApiError(
            400,
            "Password is Required"
        )
    }

    // find the user
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(
            404,
            "User does not exist"
        )
    }

    // check if input is same as password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(
            401,
            "Invalid Credentials"
        )
    }
    
    // access and refresh token 
    const {userAccessToken, userRefreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookies 
    const options = {
        httpOnly : true,
        secure : true
    }

    //send response
    return res.status(200)
    .cookie(
        "accessToken",
        userAccessToken,
        options
    )
    .cookie(
        "refreshToken",
        userRefreshToken,
        options
    )
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser, 
                userAccessToken, 
                userRefreshToken

            },
            "User Logged-In Successfully"
        )
    )
})

const logoutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset : {
                refreshToken : 1
            }
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(400)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(
        new ApiResponse(
            200,
            {},
            "User Logged Out"
        ) 
    )
})

const refreshAccessToken = asyncHandler( async(req, res) => {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(
            401,
            "Unauthorized Request"
        )
    }

    try{
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(
                401,
                "Invalid Refresh Token"
            )
        }

        if(incomingRefreshToken != user?.refreshToken){
            throw new ApiError(
                401,
                "Refresh Token is expired or Used"
            )
        }

        const options = {
            httpOnly : true,
            secure : true
        }

        const {userAccessToken, userRefreshToken} = await generateAccessAndRefreshTokens(user._id)

        return res.status(200)
        .cookie("accessToken",userAccessToken, options)
        .cookie("refreshToken", userRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    userAccessToken, refreshToken : userRefreshToken
                },
                "Access Token Refreshed"
            )
        )
    }

    catch(error){
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    if(oldPassword == newPassword){
        throw new ApiError(
            400,
            "New Password cannot be same as old Password"
        )
    }
    const userId = req.user?._id

    const user = await User.findById(userId)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Password Changed Successfully",
            {
                user
            }
        )
    )
})

const getCurrentUser = asyncHandler( async(req,res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
           "Current User fetched Successfully",
           req.user
        )   
    )
})

const updateAccountDetails = asyncHandler( async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName && !email){
        throw new ApiError(
            400,
            "Please enter new details"
        )
    }

    const user = await User.findById(req.user?._id).select("-password -refreshToken")
    
    // const updatedUser = User.findByIdAndUpdate(
    //     req.user?._id,
    //     {
    //         $set : {
    //             fullName : fullName,
    //         }
    //     }

    // )

    if(fullName && user.fullName == fullName){
        throw new ApiError(
            400,"Updated name cannot be same as before"
        )
    }
    if(email && user.email == email){
        throw new ApiError(
            400,"Updated email cannot be same as before"
        )
    }

    if(fullName) user.fullName = fullName
    if(email) user.email = email

    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Details Changed Successfully",
            {
                user
            }
        )
    )

})

const updateUserAvatar = asyncHandler( async(req, res) => {
     const avatarLocalPath = req.file?.path
    
     if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
     }

     const avatar = await uploadToCloudinary(avatarLocalPath)

     if(!avatar.url){
        throw new ApiError(400, "Error while Uploading to Cloudinary")
     }

     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {new : true}
     ).select("-password -refreshToken")

     return res
     .status(200)
     .json(
        new ApiResponse(
            200,
            "Avatar Changed Successully",
            {
                user
            }
        )
     )
})

const updateUserCoverImage = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image is missing")
    }

    const coverImage = await uploadToCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage?.url
            }
        },
        {new : true}
    ).select("-password -refreshToken")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Cover Image changed Successfully",
            {user}
        )
    )
})

const getUserChannelProfile = asyncHandler( async(req, res) => {
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(
            400,
            "Username is missing"
        )
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup :{
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscriberCount : {
                    $size : "$subscribers"
                },
                subscribedTo : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username:1,
                subscriberCount:1,
                subscribedTo : 1,
                avatar:1,
                coverImage:1,
                email :1,
                isSubscribed : 1,
                createdAt:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(
            404,
            "Channel does not exist"
        )
    }
    
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Fetched channel details",
            {channel}
        )
    )
})

const getWatchHistory = asyncHandler( async(req, res) => {
    
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullName : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            "Watch history retrieved successfully",
            user[0].watchHistory
        )
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}