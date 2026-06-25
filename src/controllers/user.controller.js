import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";
import jwt, { decode } from "jsonwebtoken"


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
    
    if(!avatarToCloudinary){
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
            $set : {
                refreshToken : undefined
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
    console.log("Entered")
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

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}