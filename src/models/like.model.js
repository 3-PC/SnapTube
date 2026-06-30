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

likeSchema.index({ video: 1, likedBy: 1 }, { unique: true, sparse: true })
likeSchema.index({ comment: 1, likedBy: 1 }, { unique: true, sparse: true })
likeSchema.index({ post: 1, likedBy: 1 }, { unique: true, sparse: true })

export const Like = mongoose.model("Like", likeSchema)