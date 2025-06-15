import { Router } from "express";
import client from "../../../../../packages/db/dist/index";
import { userMiddleware } from "../../middlewares/user";
import { GetUsersMetadataSchema, UpdateMetadataSchema } from "../../types";

export const userRouter = Router();

userRouter.post("/metadata",userMiddleware, async (req,res) => {
    const parsedData = UpdateMetadataSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({ "message": "Invalid data", "errors": parsedData.error.errors });
        return;
    }
    const { avatarId } = parsedData.data;
    try {
        const updatedUser = await client.user.update({
            where: { id: req.userId },
            data: { avatarId: avatarId }
        });
        if (!updatedUser) {
            res.status(400).json({ "message": "Failed to update user metadata" });
            return;
        }
        res.status(200).json({ 
            "message": "User metadata updated successfully",
        });
        return;
    } catch (error : any) {
        res.status(400).json({ "message": "Internal Server Error", "error": error.message });
        return;
    }
});

userRouter.get('/metadata/bulk',userMiddleware, async(req,res) => {
    const parsedData = GetUsersMetadataSchema.safeParse(req.query);
    if (!parsedData.success) {
        res.status(400).json({ "message": "Invalid query parameters", "errors": parsedData.error.errors });
        return;
    }
    const {ids} = parsedData.data;
    try {
        const users = await client.user.findMany({
            where: {
                id: {
                    in: ids
                }
            },
            select: {
                id: true,
                avatar: true,
            }
        });
        res.status(200).json({
            "avatars" : users.map(m => ({
                userId: m.id,
                imageUrl : m.avatar?.imageUrl || null,
            }))
        });
    } catch (error : any) {
        res.status(400).json({ "message": "Internal Server Error", "error": error.message });
    }
});