import { v2 as cloudinary } from "cloudinary";

const deleteFromCloudinary = async(cloudinaryURL, resourceType) => {

    let count = 7
    let i = 0
    while(i < cloudinaryURL.length){
        if(cloudinaryURL[i] === '/') count--;
        if(count == 0) break;
        i++
    }

    const url = cloudinaryURL.slice(i+1)
    const dotIndex = url.lastIndexOf('.')
    const publicId = url.slice(0, dotIndex)

    const options = {
        resource_type : resourceType
    }

   const result = await cloudinary.uploader.destroy(publicId, options)
   return result
}

export {deleteFromCloudinary}