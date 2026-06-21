import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    api_key : process.env.CLOUDINARY_API_SECRET,
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_secret: process.env.CLOUDINARY_API_KEY
})

const uploadToCloudinary = async(localFilePath) => {
    try{
        if(!localFilePath) return null
        //upload to cloudinary
        const reponse = await cloudinary.uploader.upload(localFilePath,
            {
                resource_type : "auto"
            }
        )

        //file Uploaded
        console.log("File Uploaded to Cloudinary", response)

        return response
    }catch(error){
        //remove locally saved file as the upload operation failed
        fs.unlinkSync(localFilePath)
        return null
    }
} 


export {uploadToCloudinary}