import { Router } from "express";
import { spaceRouter } from "./space";
import { userRouter } from "./user";
import { adminRouter } from "./admin";
import client from "@repo/db/client";
import {hash,compare} from "../../scrypt";
import { SignUpSchema,SignInSchema } from "../../types";
import jwt from "jsonwebtoken";
import { userMiddleware } from "../../middlewares/user";

export const router = Router();

router.post('/signup',async (req,res) => {
    const parsedData = SignUpSchema.safeParse(req.body);
    if(!parsedData.success) {
        res.status(400).json({"message": "Invalid data", "errors": parsedData.error.errors});
        return;
    }
    try {
        const { username,password,type } = parsedData.data;
        const existingUser = await client.user.findFirst({
            where: { username: username }
        });
        if (existingUser) {
            res.status(400).json({"message": "Username already exists"});
            return;
        }
        const hashPassword = await hash(password);
        const newUser = await client.user.create({
            data: {
                username: username,
                password: hashPassword,
                role: type === "admin" ? "Admin" : "User",
            }
        });
        if (!newUser) {
            res.status(400).json({"message": "Failed to create user"});
            return;
        }
        res.status(200).json({
            "userId": newUser.id,
        });
        return ;
    } catch (error: any) {
        res.status(400).json({"message": "Internal Server Error", "error": error.message});
        return;
    }
})
router.post('/signin',async (req,res) => {
    const parsedData = SignInSchema.safeParse(req.body);
    if(!parsedData.success) {
        res.status(400).json({"message": "Invalid data", "errors": parsedData.error.errors});
        return;
    }
    try {
        const { username, password } = parsedData.data;
        const user = await client.user.findFirst({
            where: { username: username }
        });
        if (!user) {
            res.status(403).json({"message": "Invalid username"});
            return;
        }
        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
            res.status(403).json({"message": "Invalid password"});
            return;
        }
        // generate JWT toeken based on role
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '5h' });
        res.status(200).json({
            "token": token
        });
        return;
    } catch (error: any) {
        res.status(403).json({"message": "Internal Server Error", "error": error.message});
    }
});

router.get('/avatars',userMiddleware, async (req,res) => {
    try {
        const avatars = await client.avatar.findMany({
            select: {
                id: true,
                name: true,
                imageUrl: true,
            }
        })
        res.status(200).json({
            "avatars": avatars,
        });
    return;
} catch (error) {
    res.status(500).json({
        "message": "Internal Server Error",
        "error": error instanceof Error ? error.message : "Unknown error"
    });
    return;
}
})
router.get('/elements', userMiddleware, async (req,res) => {
    try {
        const elements = await client.element.findMany({
            select: {
                id: true,
                name: true,
                height: true,
                width: true,
                imageUrl: true,
                static : true
            }
        });
        res.status(200).json({
            "elements": elements,
        });
    } catch (error) {
        res.status(500).json({
            "message": "Internal Server Error", 
            "error": error instanceof Error ? error.message : "Unknown error"
        });
    }
});
router.get('/test', (req,res) => {
    res.json({
        message: "Test Success All Good"
    })
});
router.use("/user",userRouter);
router.use("/space",spaceRouter);
router.use("/admin",adminRouter);
