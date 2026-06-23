import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";

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

export { registerUser }