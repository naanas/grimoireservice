import { ZodError } from 'zod';
export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    }
    catch (error) {
        if (error instanceof ZodError) {
            console.warn("Validation Error Details:", JSON.stringify(error));
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: (error.errors || []).map((e) => ({ field: (e.path || []).join('.'), message: e.message }))
            });
        }
        next(error);
    }
};
//# sourceMappingURL=validate.middleware.js.map