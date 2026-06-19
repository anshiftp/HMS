const crypto = require('node:crypto');
const JoinUs = require('../models/JoinUs.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const bcrypt = require('bcrypt')
const Role = require('../models/Role.model')
const Employee = require('../models/Employee.model')
const Doctor = require('../models/Doctor.model')

exports.createJoinUsRequest = async (joinUsData) => {
    const {
        firstName,
        lastName,
        email,
        password,
        phone,
        role,
        department,
        designation,
        joiningDate,

        specialization,
        qualification,
        consultationFee,
        medicalRegistrationNo,
        availabilityStartTime,
        availabilityEndTime,
        experienceYears
    } = joinUsData;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new ApiError(409, 'Email already registered as user');
    }

    const existingRequest = await JoinUs.findOne({ email });


    if (existingRequest) {
        if (!existingRequest.isVerified) {
            const newToken = crypto.randomBytes(32).toString('hex');

            existingRequest.verificationToken = newToken;
            existingRequest.verificationTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

            await existingRequest.save();

            const verificationLink =
                `http://localhost:5000/api/join-us/verify/${newToken}`;

            console.log('Verification Link Resent:', verificationLink);

            return {
                message: 'Verification email resent. Please verify your email.',
                data: existingRequest
            };
        }

        throw new ApiError(409, 'Join request already exists with this email');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');//decide later on the jwt 

    const joinUsRequest = await JoinUs.create({
        firstName,
        lastName,
        email,
        passwordHash,
        phone,
        role,
        department,
        designation,
        joiningDate,

        specialization: role === 'Doctor' ? specialization : undefined,
        qualification: role === 'Doctor' ? qualification : undefined,
        consultationFee: role === 'Doctor' ? consultationFee : undefined,
        medicalRegistrationNo: role === 'Doctor' ? medicalRegistrationNo : undefined,
        availabilityStartTime: role === 'Doctor' ? availabilityStartTime : undefined,
        availabilityEndTime: role === 'Doctor' ? availabilityEndTime : undefined,
        experienceYears: role === 'Doctor' ? experienceYears : undefined,

        isVerified: false,
        approvalStatus: 'PENDING',
        verificationToken,
        verificationTokenExpiry: new Date(Date.now() + 15 * 60 * 1000)
    });
    const verificationLink =
        `http://localhost:5000/api/join-us/verify/${verificationToken}`;

    console.log('Verification Link:', verificationLink);

    return {
        message: 'Join request submitted. Please verify your email.',
        data: joinUsRequest
    };
};

exports.verifyJoinUsEmail = async (token) => {
    const joinUsRequest = await JoinUs.findOne({
        verificationToken: token,
        verificationTokenExpiry: { $gt: new Date() }
    });

    if (!joinUsRequest) {
        throw new ApiError(400, 'Invalid or expired verification token');
    }

    joinUsRequest.isVerified = true;
    joinUsRequest.verificationToken = undefined;
    joinUsRequest.verificationTokenExpiry = undefined;

    await joinUsRequest.save();

    return joinUsRequest;
};

exports.getAllJoinUsRequests = async () => {
    const requests = await JoinUs.find()
        .sort({ createdAt: -1 });

    return requests;
};

exports.getPendingJoinUsRequests = async (query = {}) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search ? query.search.trim() : '';
    const skip = (page - 1) * limit;
    const all = query.all === 'true';

    const filter = {
        isVerified: true,
        approvalStatus: 'PENDING'
    };

    if (search) {
        filter.$and = [
            { isVerified: true, approvalStatus: 'PENDING' },
            {
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { role: { $regex: search, $options: 'i' } },
                    { department: { $regex: search, $options: 'i' } },
                    { designation: { $regex: search, $options: 'i' } }
                ]
            }
        ];
    }

    const totalRecords = await JoinUs.countDocuments(filter);

    let dbQuery = JoinUs.find(filter).sort({ createdAt: -1 });

    if (!all) {
        dbQuery = dbQuery.skip(skip).limit(limit);
    }

    const requests = await dbQuery;

    return {
        requests,
        pagination: {
            totalRecords,
            currentPage: all ? 1 : page,
            totalPages: all ? 1 : Math.ceil(totalRecords / limit),
            limit: all ? totalRecords : limit,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        }
    };
};

exports.checkJoinUsEmail = async (email) => {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new ApiError(409, 'Email already registered as user');
    }

    const existingRequest = await JoinUs.findOne({ email });

    if (existingRequest) {
        if (!existingRequest.isVerified) {
            return {
                canContinue: false,
                message: 'Join request already exists but email is not verified. Please verify your email.'
            };
        }

        return {
            canContinue: false,
            message: 'Join request already exists with this email.'
        };
    }

    return {
        canContinue: true,
        message: 'Email available. Continue filling the form.'
    };
};
exports.approveJoinUsRequest = async (requestId, approvedBy) => {
    const joinUsRequest = await JoinUs.findById(requestId).select('+passwordHash');

    if (!joinUsRequest) {
        throw new ApiError(404, 'Join request not found');
    }

    if (!joinUsRequest.isVerified) {
        throw new ApiError(400, 'Email is not verified yet');
    }

    if (joinUsRequest.approvalStatus !== 'PENDING') {
        throw new ApiError(400, 'Join request is already processed');
    }

    if (!joinUsRequest.passwordHash) {
        throw new ApiError(400, 'Password hash missing in join request. Please create a new join request.');
    }

    const existingUser = await User.findOne({ email: User.email });

    if (existingUser) {
        throw new ApiError(409, 'User already exists with this email');
    }

    const role = await Role.findOne({ name: joinUsRequest.role });

    if (!role) {
        throw new ApiError(404, 'Role not found');
    }

    const newUser = await User.create({
        firstName: joinUsRequest.firstName,
        lastName: joinUsRequest.lastName,
        email: joinUsRequest.email,
        passwordHash: joinUsRequest.passwordHash,
        phone: joinUsRequest.phone,
        roleId: role._id,
        isVerified: true,
        status: 'ACTIVE'
    });

    if (!joinUsRequest) {
        return res.status(400).json({ success: false, message: "Request not found" });
    }

    if(!newUser){
        return res.status(400).json({ success: false, message: "User not found" });
    }

    const newEmployee = await Employee.create({
        userId: newUser._id,
        phone: joinUsRequest.phone,
        department: joinUsRequest.department,
        designation: joinUsRequest.designation,
        joiningDate: joinUsRequest.joiningDate
    });

    let newDoctor = null;

    const isDoctor = joinUsRequest.role?.toLowerCase() === 'doctor';

    if (isDoctor) {
        newDoctor = await Doctor.create({
            userId: newUser._id,
            employeeId: newEmployee._id,
            specialization: joinUsRequest.specialization,
            qualification: joinUsRequest.qualification,
            consultationFee: joinUsRequest.consultationFee,
            medicalRegistrationNo: joinUsRequest.medicalRegistrationNo,
            availabilityStartTime: joinUsRequest.availabilityStartTime,
            availabilityEndTime: joinUsRequest.availabilityEndTime,
            experienceYears: joinUsRequest.experienceYears
        });
    }

    joinUsRequest.approvalStatus = 'APPROVED';
    joinUsRequest.approvedAt = new Date();

    if (approvedBy) {
        joinUsRequest.approvedBy = approvedBy;
    }

    await joinUsRequest.save();

    const userResponse = newUser.toObject();
    delete userResponse.passwordHash;

    return {
        message: 'Join request approved successfully',
        data: {
            user: userResponse,
            employee: newEmployee,
            doctor: newDoctor
        }
    };
};