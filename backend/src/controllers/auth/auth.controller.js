// backend/src/controllers/auth/auth.controller.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../../models/User');
const { generateToken } = require('../../utils/jwtHelper');
const { validatePassword } = require('../../utils/passwordValidator');
const { sendResetPasswordEmail } = require('../../services/emailService');

// Same client ID must be used on the frontend (GoogleOAuthProvider) and here
// (as the "audience") — that's what proves the token was issued for THIS app.
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Email already registered. Please login.' 
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      fullName,
      email,
      password: hashedPassword
    });

    await user.save();

    const token = generateToken(user._id, user.email);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed. Please try again later.'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Account is deactivated. Contact support.' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed. Please try again later.' 
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('1. Forgot password request for email:', email);

    const user = await User.findOne({ email });

    if (!user) {
      console.log('2. User not found');
      return res.status(404).json({
        message: "No account found with this email."
      });
    }

    console.log('3. User found:', user.email);

    const resetToken = crypto.randomBytes(32).toString("hex");
    console.log('4. Token generated:', resetToken);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();
    console.log('5. Token saved to database');

    console.log('6. Attempting to send email...');
    const emailResult = await sendResetPasswordEmail(email, resetToken);
    console.log('7. Email result:', emailResult);

    if (!emailResult.success) {
      console.log('8. Email sending FAILED:', emailResult.error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      console.log('9. Token cleared from database');

      return res.status(500).json({
        message: "Failed to send reset email. Please try again later."
      });
    }

    console.log('10. Email sent successfully!');
    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email address."
    });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({
      message: "Something went wrong."
    });
  }
};

// ============================================
// NEW: Reset Password Function
// ============================================
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    console.log('Reset Password - Token received:', token);

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('Reset Password - Invalid or expired token');
      return res.status(400).json({
        message: "Invalid or expired reset link. Please request a new one."
      });
    }

    console.log('Reset Password - User found:', user.email);

    // Validate new password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset tokens
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log('Reset Password - Password updated successfully');

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password."
    });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({
      message: "Something went wrong."
    });
  }
};

// ============================================
// Google Sign-In
// Frontend sends the ID token (JWT) it got from Google's Identity Services
// button. We verify that token directly with Google's servers — we never
// see or handle the user's Google password.
// ============================================
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // This call hits Google's servers to confirm the token is genuine,
    // unexpired, and was issued for our GOOGLE_CLIENT_ID specifically.
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(401).json({ message: 'Your Google email is not verified.' });
    }

    // Match on googleId first (returning Google user), then fall back to
    // email (a local-password account signing in with Google for the first
    // time gets linked instead of duplicated).
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.profilePicture && picture) {
        user.profilePicture = picture;
      }
    } else {
      user = new User({
        fullName: name || email.split('@')[0],
        email,
        googleId,
        authProvider: 'google',
        profilePicture: picture || ''
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact support.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, user.email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
};

const getProfile = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      message: 'Failed to get profile' 
    });
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,  // ← ADD THIS
  getProfile
};