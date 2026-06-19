const joinUsService = require('../service/joinUs.service');

exports.createJoinUsRequest = async (req, res, next) => {
    try {
        console.log("REQ BODY:", req.body);

        const result = await joinUsService.createJoinUsRequest(req.body);

        return res.status(201).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyJoinUsEmail = async (req, res, next) => {
    try {
        const request = await joinUsService.verifyJoinUsEmail(req.params.token);

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully. Your request is now visible for admin approval.',
            data: request
        });
    } catch (error) {
        next(error);
    }
};

exports.getAllJoinUsRequests = async (req, res, next) => {
    try {
        const requests = await joinUsService.getAllJoinUsRequests();

        return res.status(200).json({
            success: true,
            message: 'Join requests fetched successfully',
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

exports.getPendingJoinUsRequests = async (req, res, next) => {
    try {
        const result = await joinUsService.getPendingJoinUsRequests(req.query);

        return res.status(200).json({
            success: true,
            message: 'Pending verified join requests fetched successfully',
            data: result.requests,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getPendingJoinUsCount = async (req, res, next) => {
    try {
        const count = await joinUsService.getPendingJoinUsCount();

        return res.status(200).json({
            success: true,
            message: 'Pending join request count fetched successfully',
            data: {
                pendingRequests: count
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.checkJoinUsEmail = async (req, res, next) => {
    try {
        const { email } = req.body;

        const result = await joinUsService.checkJoinUsEmail(email);

        return res.status(200).json({
            success: true,
            message: result.message,
            canContinue: result.canContinue
        });
    } catch (error) {
        next(error);
    }
};
exports.approveJoinUsRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;

        const approvedBy = req.user?._id;

        const result = await joinUsService.approveJoinUsRequest(requestId, approvedBy);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        next(error);
    }
};