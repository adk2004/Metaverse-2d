import { Router } from "express";
import client from "@repo/db/client";
import { userMiddleware } from "../../middlewares/user";
import { redis } from "../../redis";
import { GetUsersMetadataSchema, UpdateMetadataSchema } from "../../types";

export const userRouter = Router();

userRouter.post("/metadata", userMiddleware, async (req, res) => {
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
        await redis.del(`user-metadata:${req.userId}`)
        res.status(200).json({
            "message": "User metadata updated successfully",
        });
        return;
    } catch (error: any) {
        res.status(400).json({ "message": "Internal Server Error", "error": error.message });
        return;
    }
});

userRouter.get('/metadata/bulk', userMiddleware, async (req, res) => {
    const parsedData = GetUsersMetadataSchema.safeParse(req.query);
    if (!parsedData.success) {
        res.status(400).json({ "message": "Invalid query parameters", "errors": parsedData.error.errors });
        return;
    }
    const { ids } = parsedData.data;
    const redisKeys = ids?.map((id) => `user-metadata:${id}`);
    try {
        const cachedData = await redis.mget(...redisKeys!);
        const found: Record<string, any> = {};
        const missingIDs: string[] = [];
        ids!.forEach((id, idx) => {
            const cached = cachedData[idx];
            if (cached) {
                try {
                    found[id] = JSON.parse(cached);
                } catch (_) {
                    missingIDs.push(id);
                }
            } else {
                missingIDs.push(id);
            }
        });
        let unfound: Record<string, any> = {};
        if (missingIDs.length > 0) {
            const users = await client.user.findMany({
                where: {
                    id: { in: missingIDs }
                },
                select: {
                    id: true,
                    avatar: true,
                }
            });
            for (let user of users) {
                const metadata = {
                    userId: user.id,
                    imageUrl: user.avatar?.imageUrl || null
                }
                unfound[user.id] = metadata;
                await redis.set(`user-metadata:${user.id}`, JSON.stringify(metadata), 'EX', 600);
            }
        }
        const avatars = ids?.map(id => found[id] || unfound[id]);
        res.status(200).json({ avatars });
    } catch (error: any) {
        res.status(400).json({ "message": "Internal Server Error", "error": error.message });
    }
});