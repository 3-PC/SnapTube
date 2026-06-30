import express, { urlencoded } from "express"
import cookieParser from "cookie-parser";
import cors from 'cors'

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN
}))

app.use(express.json({limit : "2kb"}))

app.use(urlencoded({extended : true, limit : "10kb"})) // extended for nested objects
app.use(express.static("public")) //public assets that may be used
app.use(cookieParser()) 


//routes import
import userRouter from "./routers/user.routes.js"
import commentRouter from "./routers/comment.routes.js"
import videoRouter from "./routers/video.routes.js"
 
//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/videos", videoRouter)

export {app}