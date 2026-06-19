const bcrypt = require('bcrypt');
const User = require('../models/User.model');
const Role = require('../models/Role.model');
const Employee = require('../models/Employee.model');
const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const Appointment = require('../models/appointment.model');

const seedDummyData = async () => {
    try {
        const doctorCount = await Doctor.countDocuments();
        if (doctorCount > 0) {
            console.log('⚡ Dummy data already seeded (Doctors found)');
            return;
        }

        console.log('🌱 Seeding 20 doctors, patients, and appointments...');

        const adminUser = await User.findOne({ email: 'admin@gmail.com' });
        const doctorRole = await Role.findOne({ name: 'Doctor' });

        if (!adminUser || !doctorRole) {
            console.error('❌ Super Admin or Doctor Role not found. Cannot seed dummy data.');
            return;
        }

        const passwordHash = await bcrypt.hash('Password@123', 12);

        // 1. Seed 20 Doctors
        const firstNamesDoc = [
            'Alice', 'Bob', 'Charlie', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack',
            'Karen', 'Leo', 'Mia', 'Nathan', 'Olivia', 'Paul', 'Quincy', 'Rachel', 'Sam', 'Tina'
        ];
        const lastNamesDoc = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson',
            'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White'
        ];
        const specializations = [
            'General Medicine', 'Cardiology', 'Pediatrics', 'Dermatology', 'Orthopedics',
            'Neurology', 'Psychiatry', 'Radiology', 'Ophthalmology', 'Gastroenterology'
        ];
        const qualifications = ['MBBS MD', 'MBBS MS', 'MBBS DNB', 'MBBS MD DM'];
        const fees = [500, 800, 1000, 1500];

        const doctorsList = [];

        for (let i = 0; i < 20; i++) {
            const user = await User.create({
                firstName: firstNamesDoc[i],
                lastName: lastNamesDoc[i],
                email: `doctor${i + 1}@example.com`,
                passwordHash,
                roleId: doctorRole._id,
                isVerified: true,
                status: 'ACTIVE',
                mustChangePassword: false
            });

            const employee = await Employee.create({
                userId: user._id,
                phone: `90000000${String(i + 1).padStart(2, '0')}`,
                department: i % 2 === 0 ? 'OPD' : 'IPD',
                designation: 'Jr Doctor',
                status: 'ACTIVE',
                joiningDate: new Date()
            });

            const doctor = await Doctor.create({
                employeeId: employee._id,
                specialization: specializations[i % specializations.length],
                qualification: qualifications[i % qualifications.length],
                consultationFee: fees[i % fees.length],
                medicalRegistrationNo: `REG-${100000 + i + 1}`,
                availabilityStartTime: '09:00 AM',
                availabilityEndTime: '05:00 PM',
                experienceYears: 3 + i
            });

            doctorsList.push(doctor);
        }
        console.log(`✅ Seeded 20 Doctors successfully`);

        // 2. Seed 20 Patients
        const firstNamesPat = [
            'John', 'Jane', 'Robert', 'Mary', 'William', 'Patricia', 'Richard', 'Linda', 'Joseph', 'Barbara',
            'Thomas', 'Elizabeth', 'Charles', 'Jennifer', 'Daniel', 'Maria', 'Matthew', 'Susan', 'Anthony', 'Margaret'
        ];
        const lastNamesPat = [
            'Doe', 'Smith', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Thomas', 'Anderson',
            'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis'
        ];
        const bloodGroups = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'];

        const patientsList = [];

        for (let i = 0; i < 20; i++) {
            const dob = new Date();
            dob.setFullYear(dob.getFullYear() - (20 + i)); // ages 20 to 39

            const patient = await Patient.create({
                firstName: firstNamesPat[i],
                lastName: lastNamesPat[i],
                phone: `98888888${String(i + 1).padStart(2, '0')}`,
                gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
                dob,
                bloodGroup: bloodGroups[i % bloodGroups.length],
                address: {
                    city: 'Metro City',
                    state: 'StateName',
                    pincode: '110001'
                },
                emergencyContactName: 'Emergency Contact Person',
                emergencyContactPhone: `99999999${String(i + 1).padStart(2, '0')}`,
                createdBy: adminUser._id
            });

            patientsList.push(patient);
        }
        console.log(`✅ Seeded 20 Patients successfully`);

        // 3. Seed 20 Appointments
        const reasons = [
            'Regular health checkup', 'Fever and cold checkup', 'Follow-up consultation',
            'Routine screening', 'Chronic back pain checkup', 'Headache consultation'
        ];
        const slots = ['09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'];

        for (let i = 0; i < 20; i++) {
            const appointmentDate = new Date();
            appointmentDate.setDate(appointmentDate.getDate() + (i + 1)); // schedule in next 1 to 20 days

            await Appointment.create({
                patientId: patientsList[i]._id,
                doctorId: doctorsList[i]._id,
                appointmentDate,
                timeSlot: slots[i % slots.length],
                status: 'BOOKED',
                reason: reasons[i % reasons.length],
                createdBy: adminUser._id
            });
        }
        console.log(`✅ Seeded 20 Appointments successfully`);

    } catch (error) {
        console.error('❌ Error seeding dummy data:', error.message);
    }
};

module.exports = seedDummyData;
