const ApiResponse = require('../utils/ApiResponse')
const userService = require('../service/user.service')



const createEmployeeByAdmin = async (req, res, next) => {
    try {
        const employee = await userService.createEmployeeUser(req.body);

        return res
            .status(201)
            .json(new ApiResponse(201, "Employee Registered Successfully", employee));
    }


    catch (error) {

        return res
            .status(error.statusCode || 500)
            .json({
                success: false,
                message: error.message || "something went wrong"
            });
    }
};

const updateEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;


        const loggedInUserId = req.user.userId;
        const updatedEmployee = await userService.updateEmployee(
            employeeId,
            req.body,
            loggedInUserId
        );

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                "Employee Updated Successfully",
                updatedEmployee
            ));
    } catch (error) {
        return res
            .status(error.statusCode || 500)
            .json({
                success: false,
                message: error.message || "Something went wrong"
            });
    }
};

const getAllEmployees = async (req, res) => {
    try {
        const result = await userService.getAllEmployees(req.query);

        return res
            .status(200)
            .json({
                success: true,
                statusCode: 200,
                message: "Employees Fetched Successfully",
                data: result.employees,
                pagination: result.pagination
            });
    } catch (error) {
        return res
            .status(error.statusCode || 500)
            .json({
                success: false,
                message: error.message || "Something went wrong"
            });
    }
};

const getCurrentProfile = async (req, res) => {
    try {

        const userId = req.user.userId;
        const profile = await userService.currentProfile(userId);

        return res.status(200)
            .json({
                success: true,
                statusCode: 200,
                message: "Profile Fetched Successfully",
                data: profile
            })
    }
    catch (error) {

        return res
            .status(error.statusCode || 500)
            .json({
                success: false,
                message: error.message || 'Error in Profile Fetching'
            });

    }
}

module.exports = { createEmployeeByAdmin, getCurrentProfile, getAllEmployees, updateEmployee };