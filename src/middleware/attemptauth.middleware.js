import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User }from "../models/user.models.js"

export const attemptAuth = asyncHandler( async(req, _, next) => {
    try{
        const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!accessToken){
            req.user = undefined
            return next()
        }

        const decodedToken = await jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        req.user = user || undefined
    }
    catch(error){
        req.user = undefined
    }
    next()
})