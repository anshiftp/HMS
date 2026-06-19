// services/patient.service.js

const User = require("../models/User.model");

const Role = require("../models/Role.model");
const bcrypt = require("bcrypt");

const Patient = require('../models/Patient.model');
const ApiError = require('../utils/ApiError');
const { generateToken } = require('../utils/jwt')



const mailService = require('../service/mail.service');
const sendEmail = require('../service/mail.service');
exports.createPatient = async (patientData, employeeId) => {
  const {
    firstName,
    lastName,
    phone,
    gender,
    dob,
    bloodGroup,
    address,
    emergencyContactName,
    emergencyContactPhone,
  } = patientData;

  const patient = await Patient.create({
    firstName,
    lastName,
    phone,
    gender,
    dob,
    bloodGroup,
    address,
    emergencyContactName,
    emergencyContactPhone,
    createdBy: employeeId,
  });

  return patient;
};
exports.getAllPatients = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 5;
  const search = query.search ? query.search.trim() : '';
  const skip = (page - 1) * limit;
  const all = query.all === 'true';

  const allowedSortFields = ['createdAt', 'firstName', 'lastName', 'UHID'];
  const sortBy = allowedSortFields.includes(query.sortBy)
    ? query.sortBy
    : 'createdAt';

  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const filter = {};

  if (search) {
    filter.$or = [
      { UHID: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { gender: { $regex: search, $options: 'i' } },
      { bloodGroup: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } },
      { 'address.state': { $regex: search, $options: 'i' } },
      { 'address.pincode': { $regex: search, $options: 'i' } }
    ];
  }

  const totalRecords = await Patient.countDocuments(filter);

  let dbQuery = Patient.find(filter)
    .populate({
      path: 'createdBy',
      select: 'firstName lastName email roleId',
      populate: {
        path: 'roleId',
        select: 'name roleCode',
      },
    })
    .sort({ [sortBy]: sortOrder });

  if (!all) {
    dbQuery = dbQuery.skip(skip).limit(limit);
  }

  const patients = await dbQuery;

  const formattedPatients = patients.map((patient) => ({
    patientId: patient._id,
    UHID: patient.UHID,

    firstName: patient.firstName,
    lastName: patient.lastName,
    phone: patient.phone,

    gender: patient.gender,
    dob: patient.dob,
    bloodGroup: patient.bloodGroup,

    city: patient.address?.city,
    state: patient.address?.state,
    pincode: patient.address?.pincode,

    emergencyContactName: patient.emergencyContactName,
    emergencyContactPhone: patient.emergencyContactPhone,

    createdByName:
      `${patient.createdBy?.firstName || ''} ${patient.createdBy?.lastName || ''}`.trim() ||
      patient.createdBy?.email ||
      'Unknown User',

    createdByEmail: patient.createdBy?.email,
    createdByRole: patient.createdBy?.roleId?.name,
    createdByRoleCode: patient.createdBy?.roleId?.roleCode,

    createdAt: patient.createdAt,
  }));

  return {
    patients: formattedPatients,
    pagination: {
      totalRecords,
      currentPage: all ? 1 : page,
      totalPages: all ? 1 : Math.ceil(totalRecords / limit),
      limit: all ? totalRecords : limit,
      sortBy,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc'
    }
  };
};

exports.registerPatient = async (body) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    gender,
    dob,
    bloodGroup,
    address,
    emergencyContactName,
    emergencyContactPhone,
  } = body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already registered");

  const patientRole = await Role.findOne({ name: "Patient" });
  if (!patientRole) throw new ApiError(500, "Patient role not configured");

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
    roleId: patientRole._id,
    isVerified: false,//will later implement the email verification
    status: "ACTIVE",
    mustChangePassword: true

  });
  if(!user)
  {
    throw new ApiError(404,"User not Found");
  }
  const userId = user._id;
  const token = await generateToken({ userId });
  const verifyLink = `http://localhost:5000/api/auth/verify-email/${token}`
  const html = `
    <h2>Welcome to HMS 👋</h2>

    <p>Hi ${firstName},</p>

    <p>Please verify your email to activate your account.</p>

    <a href="${verifyLink}"
       style="display:inline-block;padding:10px 20px;background:#4CAF50;color:#fff;text-decoration:none;border-radius:5px;">
       Verify Email
    </a>

    <p>Or copy and paste this link:</p>
    <p>${verifyLink}</p>

    <p>This link will expire in 24 hours.</p>
  `;
  sendEmail(
    email,
    "Welcome to HMS 🎉",
    html
  );
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const patient = await Patient.create({
    userId: user._id,
    firstName,
    lastName,
    phone,
    gender,
    dob,
    bloodGroup,
    address,
    emergencyContactName,
    emergencyContactPhone,
    createdBy: user._id,
  });

  return { message: "Registration successful", patientId: patient._id };
};

exports.getPatientProfile = async (userId) => {
  const patientProfile = await Patient.findOne({ userId })
    .populate({
      path: "userId",
      select: "-passwordHash",
      populate: {
        path: "roleId",
        select: "name roleCode"
      }
    });

  if (!patientProfile) {
    throw new ApiError(404, "Patient profile not found");
  }

  return {
    userId: patientProfile.userId._id,

    firstName: patientProfile.userId.firstName,
    lastName: patientProfile.userId.lastName,
    email: patientProfile.userId.email,

    role: patientProfile.userId.roleId.name,
    roleCode: patientProfile.userId.roleId.roleCode,

    isVerified: patientProfile.userId.isVerified,
    status: patientProfile.userId.status,
    mustChangePassword: patientProfile.userId.mustChangePassword,

    patientId: patientProfile._id,
    UHID: patientProfile.UHID,
    phone: patientProfile.phone,
    gender: patientProfile.gender,
    dob: patientProfile.dob,
    bloodGroup: patientProfile.bloodGroup,

    address: patientProfile.address,

    emergencyContactName: patientProfile.emergencyContactName,
    emergencyContactPhone: patientProfile.emergencyContactPhone
  };
};

exports.updatePatientProfile = async (userId, updateData) => {
  const patient = await Patient.findOne({ userId });

  if (!patient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  const patientAllowedFields = [
    'phone',
    'gender',
    'dob',
    'bloodGroup',
    'address',
    'emergencyContactName',
    'emergencyContactPhone'
  ];

  patientAllowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      patient[field] = updateData[field];
    }
  });

  if (updateData.firstName !== undefined || updateData.lastName !== undefined) {
    await User.findByIdAndUpdate(userId, {
      ...(updateData.firstName !== undefined && {
        firstName: updateData.firstName
      }),
      ...(updateData.lastName !== undefined && {
        lastName: updateData.lastName
      })
    });
  }

  if (updateData.firstName !== undefined) {
    patient.firstName = updateData.firstName;
  }

  if (updateData.lastName !== undefined) {
    patient.lastName = updateData.lastName;
  }

  await patient.save();

  return await Patient.findById(patient._id).populate(
    'userId',
    'firstName lastName email'
  );
};
