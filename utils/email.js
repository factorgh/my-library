import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const sendEmail = async (options) => {
  try {
    // Create Transporter
    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,

      auth: {
        user: "4c1d4b0e0ab123",
        pass: "d49a47db474fb3",
      },
    });

    // Define the email options
    const mailOptions = {
      from: '"Library - Email" <no-reply@library.com>',
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    // Actually send the email
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(
      "There was an issue sending the email. Please try again later."
    );
  }
};

export default sendEmail;
