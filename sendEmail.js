import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()
const sendEmail = (receiver,message) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user:process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        }
    })

    let mailOptions = {
        from: process.env.EMAIL,
        to: receiver,
        subject: 'price monitor bot update',
        text: message
    }

   transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
    console.log('Error sending email:', error);
    } else {
    console.log('Email sent:', info.response);
    
    }
});
}

const sendEmailWithAttachment = (filename,path) => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user:process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        }
    })

    let mailOptions = {
        from: process.env.EMAIL,
        to: receiver,
        subject: 'latest job postings from glassdoor',
        text: 'Latest job postings fromGlassdoor you can find the attached spreadsheet ',
        attachments: [
            {
                filename,
                path
            },
        ],
    }

   transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
    console.log('Error sending email:', error);
    } else {
    console.log('Email sent:', info.response);
    
    }
   })
}

export { sendEmail,sendEmailWithAttachment }