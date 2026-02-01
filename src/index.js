import dotenv from 'dotenv'
import express from "express";
import connectDB from "./db/index.js"; 

const app = express();

dotenv.config()

connectDB()

/*
(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("Error")
            throw(error)
        })

        app.listen(process.env.PORT , (req,res) => {
            console.log(`App listening on port ${process.env.PORT}`)
        })
    }
 
    catch(error){ 
        console.error(error)
    }

})() 
*/

