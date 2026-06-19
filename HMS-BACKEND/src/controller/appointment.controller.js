const appointmentService = require('../service/appointment.service');

exports.createAppointment = async (req, res, next) => {
    try {
        const appointment = await appointmentService.createAppointment(
            req.body,
            req.user?.userId,
            req.user?.role
        );

        return res.status(201).json({
            success: true,
            message: 'Appointment created successfully',
            data: appointment
        });
    } catch (error) {
        next(error);
    }
};

exports.getAppointments = async (req, res, next) => {
    try {
        const result = await appointmentService.getAppointments(req.query);

        return res.status(200).json({
            success: true,
            message: 'Appointments fetched successfully',
            data: result.appointments,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

exports.getAvailableSlots = async (req, res, next) => {
    try {
        const { doctorId, appointmentDate } = req.query;

        if (!doctorId || !appointmentDate) {
            return res.status(400).json({
                success: false,
                message: 'doctorId and appointmentDate are required'
            });
        }

        const slotData = await appointmentService.getAvailableSlots(
            doctorId,
            appointmentDate
        );

        res.status(200).json({
            success: true,
            message: 'Available slots fetched',
            data: slotData
        });
    } catch (error) {
        next(error);
    }
};

exports.getMyAppointments = async (req, res, next) => {
    try {
        const appointments = await appointmentService.getMyAppointments(
            req.user
        );

        return res.status(200).json({
            success: true,
            message: "Doctor appointments fetched successfully",
            data: appointments
        });
    } catch (error) {
        next(error);
    }
};

exports.cancelAppointment = async (req, res, next) => {
    try {
        const appointment = await appointmentService.cancelAppointment(
            req.params.appointmentId
        );

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: appointment
        });
    } catch (error) {
        next(error);
    }
};

exports.getAppointmentDetails = async (req, res, next) => {
  try {
    const data = await appointmentService.getAppointmentDetails(req.params.id);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};