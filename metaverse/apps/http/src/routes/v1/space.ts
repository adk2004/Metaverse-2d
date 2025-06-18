import { Router } from "express";
import { AddElementSchema, CreateSpaceSchema, DeleteElementSchema } from "../../types";
import client from "@repo/db/client"
import { userMiddleware } from "../../middlewares/user";
export const spaceRouter = Router();

spaceRouter.post('/', userMiddleware ,async (req,res)=> {
    const parsedData = CreateSpaceSchema.safeParse(req.body);
    if(!parsedData.success || !parsedData.data){
        res.status(400).json({
            "message" : "Invalid Input Format"
        });
        return;
    }
    const {name, dimensions, mapId} = parsedData.data
    if(!mapId){
        const newSpace = await client.space.create({
            data:{
                name,
                height : parseInt(dimensions.split('x')[1]),
                width : parseInt(dimensions.split('x')[0]),
                creatorId : req.userId!,
            }
        })
        res.status(200).json({
            spaceId : newSpace.id,
        });
        return;
    }
    const map = await client.map.findFirst({
        where: {
            id : mapId
        },
        select: {
            height : true,
            width : true,
            elements: true
        }
    })
    if (!map) {
        res.status(400).json({message: "Map not found"})
        return;
    }
    const space = await client.$transaction(async (tx) => {
        const newSpace = await tx.space.create({
            data: {
                name,
                height: map.height,
                width: map.width,
                creatorId: req.userId!,
            }
        });
        await tx.spaceElements.createMany({
            data : map.elements.map((m) => {
                return {
                    spaceId: newSpace.id,
                    elementId: m.elementId!,
                    x: m.x ?? 0,
                    y: m.y ?? 0,
                }
            })
        })
        return newSpace;
    })
    res.status(200).json({
        spaceId : space.id,
    });
    return;
})
spaceRouter.get('/all',userMiddleware, async (req,res) => {
    const spaces = await client.space.findMany({
        where: {
            creatorId: req.userId
        },
        select : {
            id : true,
            name : true,
            thumbnail : true,
            height : true,
            width : true,
        }
    })
    res.status(200).json({"spaces" : spaces.map((space) => {
        return {
            name : space.name,
            id : space.id,
            thumbnail : space.thumbnail,
            dimensions : `${space.width}x${space.height}`
        }
    })});
})
// add an element to a space
spaceRouter.post('/element',userMiddleware, async (req,res) => {
   const parsedData = AddElementSchema.safeParse(req.body);
   if(!parsedData.success || !parsedData.data) {
       res.status(400).json({
           "message" : "Invalid Input Format"
       })
       return;
   }
   const space = await client.space.findUnique({
       where: {
           id: parsedData.data.spaceId,
           creatorId: req.userId!
       },
       select: {
           height: true,
           width: true,
       }
   });
   if(!space) { 
         res.status(404).json({
              "message" : "Space not found"
         })
         return;
    }
   const { spaceId, elementId, x, y } = parsedData.data;
   if( x< 0 || y < 0 || x > space!.width || y > space!.height) {
       res.status(400).json({
              "message" : "Invalid coordinates"
         })
         return;
    }
   await client.spaceElements.create({
    data: {
        spaceId,
        elementId,
        x,
        y,
    }
   });
   res.status(200).json({
       "message" : "Element added to space successfully"
   });
    return;
});
spaceRouter.delete('/element',userMiddleware, async (req,res) => {
    const parsedData = DeleteElementSchema.safeParse(req.body);
    if(!parsedData.success || !parsedData.data) {
        res.status(400).json({
            "message" : "Invalid Input Format"
        })
        return;
    }
    const { id } = parsedData.data;
    const element = await client.spaceElements.findUnique({
        where: {
            id: id,
        },
        include: {
            space: true,
        }
    });
    if(!element){
        res.status(404).json({
            "message" : "Element Not found"
        })
        return; 
    }
    if(element.space.creatorId !== req.userId!) {
        res.status(403).json({
            "message" : "Unauthorized to delete this element"
        })
        return;  
    }
    await client.spaceElements.delete({
        where: {
            id: id,
        }
    });
    res.status(200).json({
        message : "Element Deleted Successfully"
    });
    return;
})
spaceRouter.get('/:spaceId', userMiddleware,async (req,res) => {
    const space = await client.space.findUnique({
        where : {
            id : req.params.spaceId,
        }, 
        include: {
            elements: {
                include: {
                    element: true
                }
            },
        }
    })
    if(!space){
        res.status(404).json({message: "Space not found"});
        return;
    }
    res.status(200).json({
        id: space.id,
        name: space.name,
        dimensions: `${space.width}x${space.height}`,
        elements: space.elements.map((e) => {
            return {
                id: e.id,
                name: e.element.name,
                x: e.x,
                y: e.y,
                imageUrl: e.element.imageUrl
            }
        })
    });
});
spaceRouter.delete('/:spaceId',userMiddleware, async (req,res) =>{
    const spaceId = req.params.spaceId;
    if(!spaceId){
        res.status(400).json({
            "message" : "Space ID is required"
        })
        return;
    }
    try {
        const space = await client.space.findUnique({
            where: {
                id: spaceId,
            }
        });
        if(!space) {
            res.status(400).json({message: "Space not found"});
            return;
        }
        if(space.creatorId !== req.userId!) {
            res.status(400).json({message: "you are not the owner of this space"});
            return;
        }
        await client.space.delete({
            where: {
                id: space.id
            }
        });
        res.status(200).json({
            "message" : "Space deleted successfully"
        });
        return;
    } catch (e){
        res.status(400).json({message : "Space not found or you are not the creator of this space"});
        return;
    }
});