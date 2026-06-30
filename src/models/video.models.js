import mongoose , { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; 


const videoSchema = new Schema ({
    videoFile : {
        type : String,
        required : true
    },
    thumbnail : {
        type : String,
        default : "https://res.cloudinary.com/fileupload3pc/image/upload/v1782831653/thum_iwrjl9.jpg"
    },
    title : {
        type : String,
        default : "This video has no title"
    },
    description : {
        type : String,
        required : true,
        default : "This video has no description"
    },
    duration : {
        type : Number,
        required : true
    },
    views : {
        type : Number,
        default : 0
    },
    isPublished : {
        type : Boolean,
        default : true
    },
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    }
})

videoSchema.plugin(mongooseAggregatePaginate)


export const Video = mongoose.model("Video", videoSchema) 