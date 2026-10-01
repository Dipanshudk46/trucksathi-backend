const bcrypt = require('bcrypt');

const hashPassword = async (password, saltRounds = 10) => {
    return bcrypt.hash(password, saltRounds);
};

const comparePassword = async (candidatePassword, hashedPassword) => {
    if (!candidatePassword || !hashedPassword) {
        return false;
    }
    return bcrypt.compare(candidatePassword, hashedPassword);
};

module.exports = {
    hashPassword,
    comparePassword
};
