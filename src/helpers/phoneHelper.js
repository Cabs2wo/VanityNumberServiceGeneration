const newPhoneNumber = (phoneNumber = '') => {
    return phoneNumber.replace(/[^\d+]/g, '');
}

const getDigitsOnly = (phoneNumber = '') => {
    return phoneNumber.replace(/\D/g, '');
}

module.exports = {
    newPhoneNumber,
    getDigitsOnly
}
