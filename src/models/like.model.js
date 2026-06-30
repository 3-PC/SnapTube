import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema({
    video : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Video"
    },
    comment : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Comment"
    },
    post : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Post"
    },
    likedBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    
},{timestamps : true})

export const Like = mongoose.model("Like", likeSchema)