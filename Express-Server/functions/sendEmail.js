const nodemailer = require('nodemailer');
const OurEMail = "---@gmail.com";
const passEmail = "----"

const sendEmail = (targetEmail, subjectEmail, bodyEmail) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: OurEMail,
            pass: passEmail
        }
    });

    const mailOptions = {
        from: OurEMail,
        to: targetEmail,
        subject: subjectEmail,
        html: bodyEmail
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return false
        } else {
            return true
        }
    });
}

module.exports = sendEmail