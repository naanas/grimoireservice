import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: any;
}


export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });

    try {
        if (!process.env.JWT_SECRET) {
            console.error("FATAL: JWT_SECRET is not defined.");
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ success: false, message: 'Invalid Token' });
    }
};

export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized: Please login first" });
    }

    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: "Access Denied: Admins Only" });
    }
    next();
};

export const optionalAuthenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(); // Proceed as guest
    }

    try {
        if (!process.env.JWT_SECRET) return next();
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        // If token is invalid, we still treat as guest or could fail? 
        // Safer to just proceed as guest or let them know token is bad.
        next();
    }
};

