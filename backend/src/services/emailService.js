// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.log('Nodemailer verification FAILED:');
    console.log(error);
  } else {
    console.log('Nodemailer is ready to send emails');
  }
});

// Send password reset email
const sendResetPasswordEmail = async (email, resetToken) => {
  const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
  
  console.log('Email Service - Sending to:', email);
  console.log('Email Service - Reset Link:', resetLink);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - Internship Project',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
      </div>
    `
  };

  try {
    console.log('Email Service - Attempting to send...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email Service - Sent successfully:', info.response);
    return { success: true };
  } catch (error) {
    console.error('Email Service - ERROR:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendResetPasswordEmail };