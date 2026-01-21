import jwt from 'jsonwebtoken';
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key-change-this');
        req.user = verified;
        next();
    }
    catch (error) {
        res.status(403).json({ success: false, message: 'Invalid Token' });
    }
};
//# sourceMappingURL=auth.middleware.js.map