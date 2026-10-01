const Admin = require('../models/admin.Model');
const env = require('./env.config');
const { hashPassword } = require('../utils/passwordHelper.Utils');

// Seed initial administrator on startup if no admin exists yet
const seedDefaultAdmin = async () => {
    try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            const defaultEmail = env.ADMIN_EMAIL || 'admin@trucksathi.com';
            const defaultPassword = env.ADMIN_PASSWORD;

            if (!defaultPassword || !defaultPassword.trim()) {
                console.warn(
                    '[Admin Seeding] Skipped: ADMIN_PASSWORD is not configured in environment. Refusing to create an admin account with an insecure default password.'
                );
                return false;
            }

            const hashedPassword = await hashPassword(defaultPassword, 10);

            await Admin.create({
                name: 'System Administrator',
                email: defaultEmail,
                password: hashedPassword,
                role: 'admin'
            });

            console.log(`[Admin Seeding] Default administrator provisioned: ${defaultEmail}`);
            return true;
        }

        return true;
    } catch (err) {
        console.error('[Admin Seeding] Initialization error:', err.message);
        return false;
    }
};

module.exports = seedDefaultAdmin;
