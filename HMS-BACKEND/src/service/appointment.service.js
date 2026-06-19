const Appointment = require('../models/Appointment.model');
const Patient = require('../models/Patient.model');
const Employee = require('../models/Employee.model');
const ApiError = require('../utils/ApiError');
const Doctor = require('../models/Doctor.model');
const sendMail = require('./mail.service');

const HealthRecord = require('../models/healthRecord.model');

const parseTime = (timeStr) => {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const formatTime = (totalMinutes) => {
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const period = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

const generateTimeSlots = (startTime, endTime) => {
  const slots = [];

  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);

  for (let i = startMinutes; i < endMinutes; i += 30) {
    slots.push(formatTime(i));
  }

  return slots;
};

const isToday = (appointmentDate) => {
  const today = new Date();
  const selectedDate = new Date(appointmentDate);

  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);

  return today.getTime() === selectedDate.getTime();
};

const removePastSlotsForToday = (slots, appointmentDate) => {
  if (!isToday(appointmentDate)) {
    return slots;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slots.filter((slot) => {
    const slotMinutes = parseTime(slot);
    return slotMinutes > currentMinutes;
  });
};

const validateTodaySlot = (appointmentDate, timeSlot) => {
  if (!isToday(appointmentDate)) {
    return;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const selectedSlotMinutes = parseTime(timeSlot);

  if (selectedSlotMinutes <= currentMinutes) {
    throw new ApiError(400, 'Cannot book a past time slot for today');
  }
};

const getFinalPatientId = async (patientId, loggedInUserId, loggedInUserRole) => {
  if (patientId || loggedInUserRole !== 'Patient') {
    return patientId;
  }

  const loggedInPatient = await Patient.findOne({ userId: loggedInUserId });

  if (!loggedInPatient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  return loggedInPatient._id;
};

const getAppointmentDateRange = (appointmentDate) => {
  const startDate = new Date(appointmentDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  return { startDate, endDate };
};

const sendAppointmentConfirmationMail = async ({
  appointment,
  patientId,
  doctorId,
  appointmentDate,
  timeSlot,
  reason,
}) => {
  const patient = await Patient.findById(patientId).populate({
    path: 'userId',
    select: 'firstName lastName email',
  });

  const doctor = await Doctor.findById(doctorId).populate({
    path: 'employeeId',
    populate: {
      path: 'userId',
      select: 'firstName lastName email',
    },
  });

  const patientName =
    `${patient?.userId?.firstName || patient?.firstName || ''} ${patient?.userId?.lastName || patient?.lastName || ''}`.trim();

  const email = patient?.userId?.email;

  if (!email) {
    return;
  }

  const doctorName =
    `Dr. ${doctor?.employeeId?.userId?.firstName || ''} ${doctor?.employeeId?.userId?.lastName || ''}`.trim();

  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; padding:20px;">
      <h2 style="color:#16a34a;">Appointment Confirmed ✅</h2>

      <p>Hello <strong>${patientName}</strong>,</p>

      <p>Your appointment has been successfully booked.</p>

      <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin-top: 15px;">
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Appointment ID</td>
          <td style="padding:8px;border:1px solid #ddd;">${appointment.appointmentCode}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Patient Name</td>
          <td style="padding:8px;border:1px solid #ddd;">${patientName}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Doctor</td>
          <td style="padding:8px;border:1px solid #ddd;">${doctorName}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Date</td>
          <td style="padding:8px;border:1px solid #ddd;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Time Slot</td>
          <td style="padding:8px;border:1px solid #ddd;">${timeSlot}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Reason</td>
          <td style="padding:8px;border:1px solid #ddd;">${reason || '-'}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Status</td>
          <td style="padding:8px;border:1px solid #ddd;">BOOKED</td>
        </tr>
      </table>

      <p style="margin-top:20px;">Please arrive at least 15 minutes before your scheduled appointment.</p>

      <p>
        Regards,<br/>
        <strong>Hospital Management System</strong>
      </p>
    </div>
  `;

  await sendMail(email, 'Appointment Confirmation ✅', html);
};

const sendAppointmentCancellationMail = async (appointment) => {
  const patient = await Patient.findById(appointment.patientId).populate({
    path: 'userId',
    select: 'firstName lastName email',
  });

  const doctor = await Doctor.findById(appointment.doctorId).populate({
    path: 'employeeId',
    populate: {
      path: 'userId',
      select: 'firstName lastName',
    },
  });

  const patientName =
    `${patient?.userId?.firstName || patient?.firstName || ''} ${patient?.userId?.lastName || patient?.lastName || ''}`.trim();

  const email = patient?.userId?.email;

  if (!email) {
    return;
  }

  const doctorName =
    `Dr. ${doctor?.employeeId?.userId?.firstName || ''} ${doctor?.employeeId?.userId?.lastName || ''}`.trim();

  const formattedDate = new Date(appointment.appointmentDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; padding:20px;">
      <h2 style="color:#dc2626;">Appointment Cancelled ❌</h2>

      <p>Hello <strong>${patientName}</strong>,</p>

      <p>Your appointment has been cancelled.</p>

      <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin-top: 15px;">
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Appointment ID</td>
          <td style="padding:8px;border:1px solid #ddd;">${appointment.appointmentCode}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Patient Name</td>
          <td style="padding:8px;border:1px solid #ddd;">${patientName}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Doctor</td>
          <td style="padding:8px;border:1px solid #ddd;">${doctorName}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Date</td>
          <td style="padding:8px;border:1px solid #ddd;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Time Slot</td>
          <td style="padding:8px;border:1px solid #ddd;">${appointment.timeSlot}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Reason</td>
          <td style="padding:8px;border:1px solid #ddd;">${appointment.reason || '-'}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">Status</td>
          <td style="padding:8px;border:1px solid #ddd;color:#dc2626;font-weight:bold;">CANCELLED</td>
        </tr>
      </table>

      <p style="margin-top:20px;">
        If you still require a consultation, please contact the hospital to schedule another appointment.
      </p>

      <p>
        Regards,<br/>
        <strong>Hospital Management System</strong>
      </p>
    </div>
  `;

  await sendMail(email, 'Appointment Cancelled ❌', html);
};

exports.createAppointment = async (
  appointmentData,
  loggedInUserId,
  loggedInUserRole
) => {
  const { patientId, doctorId, appointmentDate, timeSlot, reason } = appointmentData;

  const finalPatientId = await getFinalPatientId(
    patientId,
    loggedInUserId,
    loggedInUserRole
  );

  if (!finalPatientId) {
    throw new ApiError(400, 'Patient is required');
  }

  const patient = await Patient.findById(finalPatientId);

  if (!patient) {
    throw new ApiError(404, 'Patient not found');
  }

  const employeeRecord = await Employee.findById(doctorId).populate({
    path: 'userId',
    populate: { path: 'roleId' },
  });

  if (!employeeRecord) {
    throw new ApiError(404, 'Doctor not found');
  }

  const roleName = employeeRecord.userId?.roleId?.name;
  const roleCode = employeeRecord.userId?.roleId?.roleCode;

  if (roleName !== 'Doctor' && roleCode !== 'DOC') {
    throw new ApiError(400, 'Selected employee is not a doctor');
  }

  const appointmentDateObj = new Date(appointmentDate);
  appointmentDateObj.setHours(0, 0, 0, 0);

  const joiningDateObj = new Date(employeeRecord.joiningDate);
  joiningDateObj.setHours(0, 0, 0, 0);

  if (appointmentDateObj < joiningDateObj) {
    throw new ApiError(
      400,
      `Doctor is not yet joined. Appointments can only be booked on or after ${joiningDateObj.toISOString().split('T')[0]}`
    );
  }

  const doctor = await Doctor.findOne({ employeeId: doctorId });

  if (!doctor) {
    throw new ApiError(404, 'Doctor profile not found');
  }

  const availableSlots = generateTimeSlots(
    doctor.availabilityStartTime,
    doctor.availabilityEndTime
  );

  if (!availableSlots.includes(timeSlot)) {
    throw new ApiError(
      400,
      `Doctor is only available from ${doctor.availabilityStartTime} to ${doctor.availabilityEndTime}`
    );
  }

  validateTodaySlot(appointmentDate, timeSlot);

  const { startDate, endDate } = getAppointmentDateRange(appointmentDate);

  const existingAppointment = await Appointment.findOne({
    doctorId: doctor._id,
    appointmentDate: {
      $gte: startDate,
      $lt: endDate,
    },
    timeSlot,
    status: 'BOOKED',
  });

  if (existingAppointment) {
    throw new ApiError(409, 'Doctor already has an appointment in this time slot');
  }

  const patientExistingAppointment = await Appointment.findOne({
    patientId: finalPatientId,
    appointmentDate: {
      $gte: startDate,
      $lt: endDate,
    },
    timeSlot,
    status: 'BOOKED',
  });

  if (patientExistingAppointment) {
    throw new ApiError(409, 'Patient already has an appointment at this time slot');
  }

  const appointment = await Appointment.create({
    patientId: finalPatientId,
    doctorId: doctor._id,
    appointmentDate: appointmentDateObj,
    timeSlot,
    reason,
    createdBy: loggedInUserId,
  });

  try {
    await sendAppointmentConfirmationMail({
      appointment,
      patientId: finalPatientId,
      doctorId: doctor._id,
      appointmentDate,
      timeSlot,
      reason,
    });
  } catch (error) {
    console.error('Failed to send appointment confirmation email:', error.message);
  }

  return appointment;
};

exports.getAppointments = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const search = query.search ? query.search.trim() : '';
  const skip = (page - 1) * limit;
  const all = query.all === 'true';

  const filter = {};

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

    filter.$or = [
      { patientId: { $in: patientIds } },
      { doctorId: { $in: doctorIds } },
      { appointmentCode: { $regex: search, $options: 'i' } },
      { timeSlot: { $regex: search, $options: 'i' } },
      { status: { $regex: search, $options: 'i' } },
      { reason: { $regex: search, $options: 'i' } }
    ];
  }

  const totalRecords = await Appointment.countDocuments(filter);

  let dbQuery = Appointment.find(filter)
    .populate('patientId')
    .populate({
      path: 'doctorId',
      populate: {
        path: 'employeeId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email',
        },
      },
    })
    .populate('createdBy', 'firstName lastName email')
    .sort({ createdAt: -1 });

  if (!all) {
    dbQuery = dbQuery.skip(skip).limit(limit);
  }

  const appointments = await dbQuery;

  return {
    appointments,
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

exports.getMyAppointments = async (user) => {
  const { userId } = user;
  const roleCode = user.roleCode || user.rolecode;

  if (!['DOC', 'PAT'].includes(roleCode)) {
    throw new ApiError(403, 'Only patients and doctors can access my appointments');
  }

  if (roleCode === 'DOC') {
    const employee = await Employee.findOne({ userId });

    if (!employee) {
      throw new ApiError(404, 'Employee profile not found');
    }

    const doctor = await Doctor.findOne({ employeeId: employee._id });

    if (!doctor) {
      throw new ApiError(404, 'Doctor profile not found');
    }

    return await Appointment.find({ doctorId: doctor._id })
      .populate('patientId', 'UHID firstName lastName phone gender bloodGroup')
      .populate({
        path: 'doctorId',
        populate: {
          path: 'employeeId',
          populate: {
            path: 'userId',
            select: 'firstName lastName email',
          },
        },
      })
      .sort({ appointmentDate: -1 });
  }

  const patient = await Patient.findOne({ userId });

  if (!patient) {
    throw new ApiError(404, 'Patient profile not found');
  }

  return await Appointment.find({ patientId: patient._id })
    .populate('patientId', 'UHID firstName lastName phone gender bloodGroup')
    .populate({
      path: 'doctorId',
      populate: {
        path: 'employeeId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email',
        },
      },
    })
    .sort({ appointmentDate: -1 });
};

exports.getAvailableSlots = async (doctorId, appointmentDate) => {
  // doctorId here is employeeId from frontend/mobile app
  const doctor = await Doctor.findOne({ employeeId: doctorId });

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const originalSlots = generateTimeSlots(
    doctor.availabilityStartTime,
    doctor.availabilityEndTime
  );

  const visibleSlots = removePastSlotsForToday(originalSlots, appointmentDate);

  const { startDate, endDate } = getAppointmentDateRange(appointmentDate);

  const bookedAppointments = await Appointment.find({
    doctorId: doctor._id,
    appointmentDate: {
      $gte: startDate,
      $lt: endDate,
    },
    status: 'BOOKED',
  }).select('timeSlot');

  const bookedSlots = bookedAppointments.map((apt) => apt.timeSlot);

  const availableSlots = visibleSlots.filter(
    (slot) => !bookedSlots.includes(slot)
  );

  return {
    availabilityStart: doctor.availabilityStartTime,
    availabilityEnd: doctor.availabilityEndTime,
    totalSlots: visibleSlots.length,
    bookedCount: bookedSlots.length,
    allSlots: visibleSlots,
    bookedSlots,
    availableSlots,
  };
};

exports.cancelAppointment = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  if (appointment.status === 'CANCELLED') {
    throw new ApiError(400, 'Appointment is already cancelled');
  }

  if (appointment.status === 'COMPLETED') {
    throw new ApiError(400, 'Completed appointment cannot be cancelled');
  }

  const appointmentDate = new Date(appointment.appointmentDate);
  appointmentDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (appointmentDate < today) {
    throw new ApiError(400, 'Past appointments cannot be cancelled');
  }

  appointment.status = 'CANCELLED';
  await appointment.save();

  try {
    await sendAppointmentCancellationMail(appointment);
  } catch (error) {
    console.error('Failed to send cancellation email:', error.message);
  }

  return appointment;
};

exports.getAppointmentDetails = async (id) => {
  const appointment = await Appointment.findById(id)
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
    });

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const healthRecord = await HealthRecord.findOne({
    appointmentId: appointment._id,
    isDeleted: false
  });

  return {
    appointment,
    healthRecord
  };
};