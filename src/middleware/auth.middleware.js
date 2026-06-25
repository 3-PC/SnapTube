import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User }from "../models/user.models.js"
import { ApiResponse } from "../utils/apiResponse.js";

export const verifyJWT = asyncHandler( async(req, _, next) => {
    try{
        const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!accessToken){
            throw new ApiError(
                401,
                "Unauthorized Request"
            )
        }

        const decodedToken = await jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(!user){
            throw new ApiError(
                401,
                "Invalid Access Token"
            )
        }

        req.user = user
        next()
    }
    catch(error){
        throw new ApiError(
            401,
            "Invalid Access Token"
        )
    }
})