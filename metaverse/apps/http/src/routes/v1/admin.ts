import { Router } from "express";
import { CreateAvatarSchema, CreateElementSchema, createMapSchema, UpdateElementSchema } from "../../types";
import client from "../../../../../packages/db/dist/index";
import { adminMiddleware } from "../../middlewares/admin";
export const adminRouter = Router();

adminRouter.post('/element', adminMiddleware, async (req,res) => {
    const parsedData = CreateElementSchema.safeParse(req.body);
    if(!parsedData.success || !parsedData.data) {
        res.status(400).json({
            "message": "Invalid Input Format"
        });
        return;
    }
    const { imageUrl, width, height, isStatic } = parsedData.data;
    try {
        const element = await client.element.create({
            data: {
                imageUrl,
                width,
                height,
                static : isStatic || false
            }
        });
        res.status(200).json({
           id : element.id,
        });
    } catch (error) {
        console.error("Error creating element:", error);
        res.status(400).json({
            message: "Internal Server Error"
        });
    }
})
adminRouter.put('/element/:elementId', adminMiddleware,async (req,res) => {
    const parsedData = UpdateElementSchema.safeParse(req.body);
    if(!parsedData.success || !parsedData.data) {
        res.status(400).json({
            "message": "Invalid Input Format"
        });
        return;
    }
    const { imageUrl } = parsedData.data;
    const { elementId } = req.params;
    try {
        const element = await client.element.update({
            where: { id: elementId },
            data: {
                imageUrl
            }
        });
        res.status(200).json({
            message: "Element updated successfully",
        });
    } catch (error) {
        console.error("Error updating element:", error);
        res.status(400).json({
            message: "Internal Server Error"
        });
    }
})
adminRouter.post('/avatar',adminMiddleware, async (req,res) => {
    const parsedData = CreateAvatarSchema.safeParse(req.body);
    if(!parsedData.success || !parsedData.data) {
        res.status(400).json({
            "message": "Invalid Input Format"
        });
        return;
    }
    const { name, imageUrl } = parsedData.data;
    try {
        const avatar = await client.avatar.create({
            data : {
                name,
                imageUrl
            }
        })
        res.status(200).json({
           avatarId : avatar.id
        })
        return;
    } catch(e){
        res.status(400).json({
            message : "Internal server error"
        })
        return;
    }
})
adminRouter.post('/map', adminMiddleware,async (req,res) => {
    const parsedData = createMapSchema.safeParse(req.body);
    if(!parsedData.success || !parsedData.data) {
        res.status(400).json({
            "message": "Invalid Input Format"
        });
        return;
    }
    const map = await client.$transaction(async () => {
        const newMap = await client.map.create({
            data : {
                name : parsedData.data.name,
                thumbnail : parsedData.data.thumbnail,
                height : parseInt(parsedData.data.dimensions.split('x')[1]),
                width : parseInt(parsedData.data.dimensions.split('x')[0]),
                creatorId : req.userId!,
            }
        })
        await client.mapElements.createMany({
            data : parsedData.data.defaultElements.map((element) => ({
                mapId: newMap.id,
                elementId: element.elementId,
                x: element.x,
                y: element.y
            }))
        })
        return newMap;
    })
    res.status(200).json({
        id : map.id
    })
})