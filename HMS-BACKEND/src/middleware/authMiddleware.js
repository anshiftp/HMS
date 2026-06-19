const {verifyToken} =require('../utils/jwt')

const authMiddleware=(req,res,next)=>
{
    try{
        let token = null;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            }
        }

        if (!token)
        {
            return res.status(401).json(
                {
                success:false,
                message:"Token Missing"
                }
            );
        }

        const decoded=verifyToken(token);

        req.user=decoded;
        next();
        console.log(req.user);

    }
    catch(error)
    {
        return res.status(401).json({
        success:false,
        message:error.message||"Invalid or expired token "
        });
        
    }
};

module.exports =authMiddleware;