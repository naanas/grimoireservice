import jwt from 'jsonwebtoken';
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
    try {
        if (!process.env.JWT_SECRET) {
            console.error("FATAL: JWT_SECRET is not defined.");
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    }
    catch (error) {
        res.status(403).json({ success: false, message: 'Invalid Token' });
    }
};
export const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized: Please login first" });
    }
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: "Access Denied: Admins Only" });
    }
    next();
};
//# sourceMappingURL=auth.middleware.js.map