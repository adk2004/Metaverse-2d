import { z } from "zod";

export const SignUpSchema = z.object({
    username: z.string(),
    password: z.string().min(8),
    type: z.enum(["user", "admin"]),
});
export const SignInSchema = z.object({
    username: z.string(),
    password: z.string().min(8),
});
export const UpdateMetadataSchema = z.object({
    avatarId: z.string()
});

export const GetUsersMetadataSchema = z.object({
    // '[1,2,3]' is a string representation of an array of user IDs
    ids: z.string().transform((val) => {
        try {
            const trimmed = val.trim();
            if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
                throw new Error("Must start and end with [ ]");
            }

            const withoutBrackets = trimmed.slice(1, -1);
            const items = withoutBrackets
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            return items;
        } catch (e) {
           console.error("Invalid userIds format in metadata/bulk request:", e);
        }
    }),
});

export const CreateSpaceSchema = z.object({
    name: z.string().min(1),
    dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/), // e.g. "800x600"
    mapId : z.string().optional(),
});
export const AddElementSchema = z.object({
    spaceId: z.string(),
    elementId: z.string(),
    x: z.number().int().min(0),
    y: z.number().int().min(0),
});
export const DeleteElementSchema = z.object({
    id : z.string(),
});
export const CreateElementSchema = z.object({
    imageUrl: z.string().url(),
    width: z.number().min(0),
    height: z.number().min(0),
    isStatic: z.boolean().optional(),
});
export const UpdateElementSchema = z.object({
    imageUrl: z.string().url(),
});
export const CreateAvatarSchema = z.object({
    name : z.string().min(1),
    imageUrl: z.string().url(),
});
export const createMapSchema = z.object({
    name : z.string(),
    dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
    thumbnail: z.string(),
    defaultElements : z.array(z.object({
        elementId : z.string(),
        x: z.number().min(0),
        y: z.number().min(0),
    })),
});


// here we extend the Express Request interface to include custom properties
// such as role and userId, which can be set by middleware i.e. adminMiddleware and userMiddleware

declare global {
    namespace Express {
        interface Request {
            role?: "Admin" | "User";
            userId?: string;
        }
    }
}