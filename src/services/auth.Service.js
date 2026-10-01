const DriverRepository = require('../repositories/driver.Repository');
const MechanicRepository = require('../repositories/mechanic.Repository');
const AdminRepository = require('../repositories/admin.Repository');
const { hashPassword, comparePassword } = require('../utils/passwordHelper.Utils');
const { generateToken } = require('../utils/jwtHelper.Utils');
const AppError = require('../utils/AppError.Utils');

const registerDriver = async (data) => {
    const { name, email, phone, password, role = 'driver' } = data;

    const existingEmail = await DriverRepository.findByEmail(email);
    if (existingEmail) {
        throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
    }

    const existingPhone = await DriverRepository.findByPhone(phone);
    if (existingPhone) {
        throw new AppError('phone no already exists', 400, 'PHONE_EXISTS');
    }

    const hashedPassword = await hashPassword(password, 10);

    const newDriver = await DriverRepository.create({
        name,
        email,
        phone,
        password: hashedPassword,
        role
    });

    const driverResponse = newDriver.toObject ? newDriver.toObject() : { ...newDriver };
    delete driverResponse.password;

    return driverResponse;
};

const loginDriver = async (email, password) => {
    const user = await DriverRepository.findByEmailWithPassword(email);
    if (!user) {
        throw new AppError('User not found', 400, 'USER_NOT_FOUND');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
        throw new AppError('Invalid credentials', 400, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({ id: user._id, role: user.role }, '7d');

    return {
        message: 'Login successful',
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
};

const registerMechanic = async (data) => {
    const { name, phone, email, password, shopName, services, location } = data;

    const existingEmail = await MechanicRepository.findByEmail(email);
    if (existingEmail) {
        throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    const existingPhone = await MechanicRepository.findByPhone(phone);
    if (existingPhone) {
        throw new AppError('Phone already registered', 400, 'PHONE_EXISTS');
    }

    const hashedPassword = await hashPassword(password, 10);

    const newMechanic = await MechanicRepository.create({
        name,
        email,
        phone,
        password: hashedPassword,
        shopName,
        services,
        location: {
            type: 'Point',
            coordinates: [parseFloat(location.lng), parseFloat(location.lat)]
        },
        role: 'mechanic'
    });

    const mechanicResponse = newMechanic.toObject ? newMechanic.toObject() : { ...newMechanic };
    delete mechanicResponse.password;

    return mechanicResponse;
};

const loginMechanic = async (email, password) => {
    const user = await MechanicRepository.findByEmailWithPassword(email);
    if (!user) {
        throw new AppError('User not found', 400, 'USER_NOT_FOUND');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
        throw new AppError('Invalid credentials', 400, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({ id: user._id, role: user.role }, '7d');

    return {
        message: 'Login successful',
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
};

const loginAdmin = async (email, password) => {
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const admin = await AdminRepository.findByEmailWithPassword(cleanEmail);
    if (!admin) {
        throw new AppError('Invalid admin credentials', 400, 'INVALID_CREDENTIALS');
    }

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) {
        throw new AppError('Invalid admin credentials', 400, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({ id: admin._id, role: 'admin' }, '7d');

    return {
        message: 'Admin login successful',
        token,
        user: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: 'admin'
        }
    };
};

module.exports = {
    registerDriver,
    loginDriver,
    registerMechanic,
    loginMechanic,
    loginAdmin
};
