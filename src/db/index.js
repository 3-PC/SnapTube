import mongoose, { mongo } from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try{    
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`MONGODB Connected, Host : ${connectionInstance.connection.host}`)
    }catch(err){
        console.error(err)
        process.exit(1)
    }
}

export default connectDB