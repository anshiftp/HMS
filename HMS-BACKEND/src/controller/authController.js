const ApiResponse = require('../utils/ApiResponse')
const authService=require('../service/auth.service')

const verifyEmail=async(req,res)=>{
    try{
        const{token}=req.params;

        const result=await authService.verifyEmployeeEmail(token);
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                "Email Verified Successfully",
                result
            )
        );
    }
    catch(error){
         return res
            .status(error.statusCode || 500)
            .json({
                success: false,
                message: error.message || "something went wrong"
            });
    };
};

const login=async(req,res)=>{
    try{
        const result=await authService.loginEmployee(req.body);
        
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        return res
            .status(200)
            .json(new ApiResponse(200,"Login Successfull",result));


    }
    catch(error)
    {
        return res 
        .status(error.statusCode||500)
        .json({
            success:false,
            message:error.message||"something went wrong"
        });

    };
}


const changePassword = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const result = await authService.changePassword(userId, req.body);

        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
            data: result
        });

    } catch (error) {
        next(error);
    }
};

const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        return res
            .status(200)
            .json(new ApiResponse(200, "Logout Successfull", null));
    } catch (error) {
        return res
            .status(500)
            .json({
                success: false,
                message: error.message || "Logout failed"
            });
    }
};

module.exports={verifyEmail,login,changePassword,logout};