import dotenv from 'dotenv'
import connectDB from "./db/index.js"; 
import { app } from './app.js';


dotenv.config()

connectDB()
.then(() => {
    app.on("error", (error) => {
        throw error; 
    })
    app.listen(process.env.PORT || 9000, () => {
        console.log(`Server connected to mongo and running at port ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.error("MongoDB connection Failed!")
    process.exit(1)
})

/*
(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("Error")
            throw(error)
        })

        app.listen(process.env.PORT , () => {
            console.log(`App listening on port ${process.env.PORT}`)
        })
    }
 
    catch(error){ 
        console.error(error)
    }

})() 
*/

