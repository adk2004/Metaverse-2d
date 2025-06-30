import express from "express";
import { router } from "./routes/v1";
import { configDotenv } from "dotenv";
import path from "path";
configDotenv({
    path : path.resolve(__dirname,'../../.env')
})

const app = express(); 


// this is to parse the request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);

app.listen(parseInt(process.env.HTTP_PORT!), '0.0.0.0', (error)=> {
    if(error)
        console.error(error);
    else 
        console.log(`Server started on port ${process.env.HTTP_PORT}`)
});