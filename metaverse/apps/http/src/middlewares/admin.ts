import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { env } from "../env";

interface JwtPayload {
  role: string;
  userId: string;
}

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(403)
      .json({ message: "Authorization header is missing or malformed" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if(!token) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if(decoded.role !== "Admin") {
      res.status(403).json({ message: "Forbidden: Admins only" });
      return;
    }
    req.userId = decoded.userId;
    next();
  } catch (error: any) {
    res.status(403).json({ message: "Unauthorized", error: error.message });
    return;
  }
};
