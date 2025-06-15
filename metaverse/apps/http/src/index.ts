import express from "express";
import { router } from "./routes/v1";
import { env } from "./env";

const app = express(); 

// this is to parse the request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);

app.listen(env.PORT, (error)=> {
    if(error)
        console.error(error);
    else 
        console.log(`Server started on port ${env.PORT}`)
});