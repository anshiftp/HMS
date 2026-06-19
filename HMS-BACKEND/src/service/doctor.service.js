const User = require('../models/User.model')
const RoleModel = require('../models/Role.model')
const Employee = require('../models/Employee.model')
const Doctor = require('../models/Doctor.model')
const bcrypt = require('bcrypt');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service')

exports.createDoctorByAdmin = async (doctorData) => {
    const {
        firstName,
        lastName,
        email,
        password,
        phone,
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
    } = doctorData;

    const existingDoctor = await Doctor.findOne({ medicalRegistrationNo });


    if (existingDoctor) {
        throw new ApiError(409, 'Medical registration number already exists');
    }


    const employeeData = await userService.createEmployeeUser({
        firstName,
        lastName,
        email,
        password,
        phone,
        role: 'Doctor',
        department,
        designation,
        joiningDate

    });

    const doctor = await Doctor.create({
        employeeId: employeeData.employeeId,
        specialization,
        qualification,
        consultationFee,
        medicalRegistrationNo,
        availabilityStartTime,
        availabilityEndTime,
        experienceYears,
    });


    return {
        employeeId: employeeData.employeeId,
        employeeCode: employeeData.employeeCode,
        doctorId: doctor._id,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email,
        phone: employeeData.phone,
        role: employeeData.role,
        department: employeeData.department,
        designation: employeeData.designation,
        joiningDate: employeeData.joiningDate,
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        consultationFee: doctor.consultationFee,
        medicalRegistrationNo: doctor.medicalRegistrationNo,
        availabilityStartTime: doctor.availabilityStartTime,
        availabilityEndTime: doctor.availabilityEndTime,
        experienceYears: doctor.experienceYears,

        isVerified: employeeData.isVerified,
        status: employeeData.status,
        mustChangePassword: employeeData.mustChangePassword,
        emailSent: employeeData.emailSent
    };

};

//update helper functions
const findDoctorRecords = async (doctorId) => {
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    const employee = await Employee.findById(doctor.employeeId);

    if (!employee) {
        throw new ApiError(404, "Employee record not found for this doctor");
    }

    const user = await User.findById(employee.userId);

    if (!user) {
        throw new ApiError(404, "User record not found for this doctor");
    }

    return { doctor, employee, user };
};

const updateEmailIfChanged = async (user, email) => {
    if (!email || email === user.email) {
        return;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
        throw new ApiError(409, "Email already exists");
    }

    user.email = email;
};

const updateMedicalRegistrationIfChanged = async (
    doctor,
    medicalRegistrationNo
) => {
    if (
        !medicalRegistrationNo ||
        medicalRegistrationNo === doctor.medicalRegistrationNo
    ) {
        return;
    }

    const existingDoctor = await Doctor.findOne({ medicalRegistrationNo });

    if (existingDoctor) {
        throw new ApiError(409, "Medical registration number already exists");
    }

    doctor.medicalRegistrationNo = medicalRegistrationNo;
};

const assignIfDefined = (target, field, value) => {
    if (value !== undefined) {
        target[field] = value;
    }
};

const updateUserFields = (user, data) => {
    assignIfDefined(user, "firstName", data.firstName);
    assignIfDefined(user, "lastName", data.lastName);
};

const updateEmployeeFields = (employee, data) => {
    assignIfDefined(employee, "phone", data.phone);
    assignIfDefined(employee, "department", data.department);
    assignIfDefined(employee, "designation", data.designation);
    assignIfDefined(employee, "joiningDate", data.joiningDate);
};

const updateDoctorFields = (doctor, data) => {
    assignIfDefined(doctor, "specialization", data.specialization);
    assignIfDefined(doctor, "qualification", data.qualification);
    assignIfDefined(doctor, "consultationFee", data.consultationFee);
    assignIfDefined(doctor, "availabilityStartTime", data.availabilityStartTime);
    assignIfDefined(doctor, "availabilityEndTime", data.availabilityEndTime);
    assignIfDefined(doctor, "experienceYears", data.experienceYears);
};

const updateStatusIfDefined = (user, employee, status) => {
    if (status !== undefined) {
        user.status = status;
        employee.status = status;
    }
};

const buildDoctorResponse = (doctor, employee, user) => {
    return {
        doctorId: doctor._id,

        employeeId: employee._id,
        employeeCode: employee.employeeCode,

        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,

        phone: employee.phone,
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,

        specialization: doctor.specialization,
        qualification: doctor.qualification,
        consultationFee: doctor.consultationFee,
        medicalRegistrationNo: doctor.medicalRegistrationNo,
        availabilityStartTime: doctor.availabilityStartTime,
        availabilityEndTime: doctor.availabilityEndTime,
        experienceYears: doctor.experienceYears,

        status: user.status,
        isVerified: user.isVerified
    };
};

exports.updateDoctor = async (doctorId, data) => {
    const { doctor, employee, user } = await findDoctorRecords(doctorId);

    await updateEmailIfChanged(user, data.email);

    await updateMedicalRegistrationIfChanged(
        doctor,
        data.medicalRegistrationNo
    );

    updateUserFields(user, data);
    updateStatusIfDefined(user, employee, data.status);
    updateEmployeeFields(employee, data);
    updateDoctorFields(doctor, data);

    await user.save();
    await employee.save();
    await doctor.save();

    return buildDoctorResponse(doctor, employee, user);
};

exports.getAllDoctors = async (query = {}) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search ? query.search.trim() : '';
    const skip = (page - 1) * limit;
    const all = query.all === 'true';

    const filter = {};

    if (search) {
        const matchingUsers = await User.find({
            $or: [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        }).select('_id');
        const userIds = matchingUsers.map(u => u._id);

        const matchingEmployees = await Employee.find({
            $or: [
                { userId: { $in: userIds } },
                { employeeCode: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } }
            ]
        }).select('_id');
        const employeeIds = matchingEmployees.map(e => e._id);

        filter.$or = [
            { employeeId: { $in: employeeIds } },
            { specialization: { $regex: search, $options: 'i' } },
            { qualification: { $regex: search, $options: 'i' } },
            { medicalRegistrationNo: { $regex: search, $options: 'i' } }
        ];
    }

    const totalRecords = await Doctor.countDocuments(filter);

    let dbQuery = Doctor.find(filter)
        .populate({
            path: 'employeeId',
            populate: {
                path: 'userId',
                select: 'firstName lastName email phone status isVerified'
            }
        })
        .sort({ createdAt: -1 });

    if (!all) {
        dbQuery = dbQuery.skip(skip).limit(limit);
    }

    const doctors = await dbQuery;

    const formattedDoctors = doctors.map((doctor) => ({
        doctorId: doctor._id,

        employeeId: doctor.employeeId?._id,
        employeeCode: doctor.employeeId?.employeeCode,

        firstName: doctor.employeeId?.userId?.firstName,
        lastName: doctor.employeeId?.userId?.lastName,
        email: doctor.employeeId?.userId?.email,
        phone: doctor.employeeId?.phone,

        specialization: doctor.specialization,
        qualification: doctor.qualification,
        consultationFee: doctor.consultationFee,
        medicalRegistrationNo: doctor.medicalRegistrationNo,
        availabilityStartTime: doctor.availabilityStartTime,
        availabilityEndTime: doctor.availabilityEndTime,
        experienceYears: doctor.experienceYears,

        joiningDate: doctor.employeeId?.joiningDate,

        status: doctor.employeeId?.userId?.status,
        isVerified: doctor.employeeId?.userId?.isVerified
    }));

    return {
        doctors: formattedDoctors,
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