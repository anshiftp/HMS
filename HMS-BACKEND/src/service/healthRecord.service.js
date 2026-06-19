const HealthRecord = require('../models/healthRecord.model');
const Appointment = require('../models/appointment.model');
const Employee = require('../models/Employee.model');
const Doctor=require('../models/Doctor.model')
const ApiError = require('../utils/ApiError');

const getLoggedInEmployee = async (userId) => {
  const employee = await Employee.findOne({ userId });

  if (!employee) {
    throw new ApiError(404, 'Employee profile not found');
  }

  return employee;
};

exports.createHealthRecord = async (data, loggedInUser) => {
  const { appointmentId, diagnosis, prescription, notes } = data;

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  if (appointment.status === 'CANCELLED') {
    throw new ApiError(400, 'Health record cannot be created for cancelled appointment');
  }

  if (appointment.status === 'COMPLETED') {
    throw new ApiError(400, 'Health record already finalized for this appointment');
  }

  const existingRecord = await HealthRecord.findOne({
    appointmentId,
    isDeleted: false
  });

  if (existingRecord) {
    throw new ApiError(400, 'Health record already exists for this appointment');
  }

  const createdByEmployee = await getLoggedInEmployee(loggedInUser.userId);

  const healthRecord = await HealthRecord.create({
    appointmentId: appointment._id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    symptomsReason: appointment.reason,
    diagnosis,
    prescription,
    notes,
    status: 'DRAFT',
    createdBy: createdByEmployee._id
  });

  return healthRecord;
};
exports.getHealthRecords = async (loggedInUser, query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const search = query.search ? query.search.trim() : '';
  const skip = (page - 1) * limit;
  const all = query.all === 'true';

  const filter = {
    isDeleted: false
  };

  if (loggedInUser.rolecode === 'DOC' || loggedInUser.role === 'Doctor') {
    const employee = await Employee.findOne({
      userId: loggedInUser.userId
    });

    if (!employee) {
      throw new ApiError(404, 'Employee profile not found');
    }

    const doctor = await Doctor.findOne({
      employeeId: employee._id
    });

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    filter.doctorId = doctor._id;
  }

  if (search) {
    // 1. Find matching Patients
    const matchingPatients = await Patient.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { UHID: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    const patientIds = matchingPatients.map(p => p._id);

    // 2. Find matching Doctors via Employee & User
    const matchingUsers = await User.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    const userIds = matchingUsers.map(u => u._id);

    const matchingEmployees = await Employee.find({
      $or: [
        { userId: { $in: userIds } },
        { department: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    const employeeIds = matchingEmployees.map(e => e._id);

    const matchingDoctors = await Doctor.find({
      employeeId: { $in: employeeIds }
    }).select('_id');
    const doctorIds = matchingDoctors.map(d => d._id);

    // 3. Find matching Appointments
    const matchingAppointments = await Appointment.find({
      appointmentCode: { $regex: search, $options: 'i' }
    }).select('_id');
    const appointmentIds = matchingAppointments.map(a => a._id);

    filter.$or = [
      { patientId: { $in: patientIds } },
      { doctorId: { $in: doctorIds } },
      { appointmentId: { $in: appointmentIds } },
      { diagnosis: { $regex: search, $options: 'i' } },
      { status: { $regex: search, $options: 'i' } }
    ];
  }

  const totalRecords = await HealthRecord.countDocuments(filter);

  let dbQuery = HealthRecord.find(filter)
    .populate('patientId', 'UHID firstName lastName phone gender dob')
    .populate({
      path: 'doctorId',
      populate: {
        path: 'employeeId',
        select: 'employeeCode department designation userId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email'
        }
      }
    })
    .populate('appointmentId', 'appointmentCode appointmentDate timeSlot status reason')
    .sort({ createdAt: -1 });

  if (!all) {
    dbQuery = dbQuery.skip(skip).limit(limit);
  }

  const healthRecords = await dbQuery;

  return {
    healthRecords,
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

exports.getHealthRecordById = async (id) => {
  const record = await HealthRecord.findOne({
    _id: id,
    isDeleted: false
  })
    .populate('appointmentId', 'appointmentCode appointmentDate timeSlot status reason')
    .populate('patientId', 'UHID firstName lastName phone gender')
    .populate({
      path: 'doctorId',
      select: 'employeeCode department designation userId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email'
      }
    })
    .populate({
      path: 'createdBy',
      select: 'employeeCode department designation userId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email'
      }
    })
    .populate({
      path: 'finalizedBy',
      select: 'employeeCode department designation userId',
      populate: {
        path: 'userId',
        select: 'firstName lastName email'
      }
    });

  if (!record) {
    throw new ApiError(404, 'Health record not found');
  }

  return record;
};

exports.updateHealthRecord = async (id, data) => {
  const record = await HealthRecord.findOne({
    _id: id,
    isDeleted: false
  });

  if (!record) {
    throw new ApiError(404, 'Health record not found');
  }

  if (record.status === 'FINALIZED') {
    throw new ApiError(400, 'Finalized health record cannot be edited');
  }

  record.diagnosis = data.diagnosis;
  record.prescription = data.prescription;
  record.notes = data.notes;

  await record.save();

  return record;
};

exports.finalizeHealthRecord = async (id, loggedInUser) => {
  if (loggedInUser.rolecode !== 'DOC' && loggedInUser.roleCode !== 'DOC') {
    throw new ApiError(403, 'Only doctor can finalize health record');
  }

  const record = await HealthRecord.findOne({
    _id: id,
    isDeleted: false
  });

  if (!record) {
    throw new ApiError(404, 'Health record not found');
  }

  if (record.status === 'FINALIZED') {
    throw new ApiError(400, 'Health record is already finalized');
  }

  if (!record.diagnosis || !record.prescription || record.prescription.length === 0) {
    throw new ApiError(400, 'Diagnosis and prescription are required before finalizing');
  }

  const finalizedByEmployee = await getLoggedInEmployee(loggedInUser.userId);

  record.status = 'FINALIZED';
  record.finalizedAt = new Date();
  record.finalizedBy = finalizedByEmployee._id;

  await record.save();

  await Appointment.findByIdAndUpdate(record.appointmentId, {
    status: 'COMPLETED'
  });

  return record;
};

exports.softDeleteHealthRecord = async (id, loggedInUser) => {
  const record = await HealthRecord.findOne({
    _id: id,
    isDeleted: false
  });

  if (!record) {
    throw new ApiError(404, 'Health record not found');
  }

  if (record.status === 'FINALIZED') {
    throw new ApiError(400, 'Finalized health record cannot be deleted');
  }

  record.isDeleted = true;
  record.deletedAt = new Date();
  record.deletedBy = loggedInUser.userId;

  await record.save();

  return record;
};