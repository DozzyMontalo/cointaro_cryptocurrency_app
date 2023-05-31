const nodemailer = require("nodemailer");

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "your-email-service-provider",
  auth: {
    user: "your-email-address",
    pass: "your-email-password",
  },
});

// Define a function to send an email notification
async function sendEmailNotification(notification) {
  try {
    // Prepare the email options
    const mailOptions = {
      from: "your-predefined-from-email-address",
      to: "admin-email-address",
      subject: "New Send Request",
      text: `New send request from user ${notification.user} to address ${notification.walletAddress}. Amount: ${notification.amount} ${notification.coin}`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log("Email notification sent to the admin.");
  } catch (error) {
    console.error("Error sending email notification:", error);
    throw error;
  }
}

// Define a function to send an email notification
async function sendResetEmail(email, resetToken) {
  try {
    // Prepare the email options
    const mailOptions = {
      from: "your-predefined-from-email-address",
      to: email,
      subject: "Password Reset",
      text: `Click the following link to reset your password: ${resetToken}`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log("Email notification sent to the user.");
  } catch (error) {
    console.error("Error sending email notification:", error);
    throw error;
  }
}
module.exports = { sendEmailNotification, sendResetEmail };
