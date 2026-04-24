import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Department from "../models/Department.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const buildToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const normalizeGoogleUser = (payload) => {
  const fullName = String(payload?.name || payload?.email || "Google User").trim();
  return {
    name: fullName || "Google User",
    email: String(payload?.email || "").trim().toLowerCase(),
    picture: payload?.picture || null,
  };
};

const createOtpMailer = () => {
  const host = process.env.GMAIL_SMTP_SERVER;
  const port = Number(process.env.GMAIL_SMTP_PORT || 587);
  const secure = String(process.env.GMAIL_SMTP_SECURITY || "TLS").toUpperCase() === "SSL";
  const user = process.env.GMAIL_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

const sendLoginOtpEmail = async (toEmail, otp) => {
  const transporter = createOtpMailer();
  if (!transporter) {
    console.warn("OTP mailer is not configured. Returning OTP for demo/testing only.");
    return false;
  }

  await transporter.sendMail({
    from: process.env.GMAIL_EMAIL,
    to: toEmail,
    subject: "Your KMRL login OTP",
    text: `Your login OTP is ${otp}. It will expire in 10 minutes.`,
    html: `<p>Your login OTP is <strong>${otp}</strong>.</p><p>This code will expire in 10 minutes.</p>`,
  });

  return true;
};
export const registerUser = async (data) => {
  const { name, email, password, role, department_id } = data;

  // Check if user exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    department_id,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return newUser;
};

export const loginUser=async(email,password)=>{
    const user=await User.findOne({where:{email}});
    if(!user){
        throw new Error("Invalid email or password");
    }

    const isMatch=await bcrypt.compare(password,user.password);
    if(!isMatch){
        throw new Error("Invalid email or password");
    }

    const token=buildToken(user);

return {user,token};
}

export const requestLoginOtp = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw new Error("Email not found");
  }

  const otp = generateOtp();
  user.login_otp = otp;
  user.login_otp_expiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  let sent = false;
  try {
    sent = await sendLoginOtpEmail(user.email, otp);
  } catch (error) {
    console.warn("Failed to send login OTP email:", error?.message || error);
  }

  return {
    message: "OTP generated successfully",
    otp,
    sent,
  };
};

export const verifyLoginOtp = async (email, otp) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const enteredOtp = String(otp || "").trim();

  if (!normalizedEmail || !enteredOtp) {
    throw new Error("Email and OTP are required");
  }

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user || String(user.login_otp || "") !== enteredOtp) {
    throw new Error("Invalid OTP");
  }

  if (!user.login_otp_expiry || Date.now() > new Date(user.login_otp_expiry).getTime()) {
    throw new Error("OTP expired");
  }

  user.login_otp = null;
  user.login_otp_expiry = null;
  await user.save();

  const token = buildToken(user);
  return { user, token };
};

export const googleSignIn = async (credential) => {
  const token = String(credential || "").trim();
  if (!token) {
    throw new Error("Google credential is required");
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || "Invalid Google token");
  }

  const configuredClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  if (configuredClientId && payload.aud !== configuredClientId) {
    throw new Error("Google token audience mismatch");
  }

  if (String(payload.email_verified || "").toLowerCase() !== "true") {
    throw new Error("Google email is not verified");
  }

  const googleUser = normalizeGoogleUser(payload);
  if (!googleUser.email) {
    throw new Error("Google account email is missing");
  }

  let user = await User.findOne({ where: { email: googleUser.email } });
  if (!user) {
    const defaultDepartment = await Department.findOne({ order: [["id", "ASC"]] });
    const departmentId = defaultDepartment?.id || 1;
    const randomPassword = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

    user = await User.create({
      name: googleUser.name,
      email: googleUser.email,
      password: await bcrypt.hash(randomPassword, 10),
      role: "STAFF",
      department_id: departmentId,
      created_at: new Date(),
      updated_at: new Date(),
    });
  } else if (googleUser.name && googleUser.name !== user.name) {
    user.name = googleUser.name;
    await user.save();
  }

  return {
    user,
    token: buildToken(user),
  };
};

export const requestGoogleLoginOtp = async (credential) => {
  const { user } = await googleSignIn(credential);
  const otpResult = await requestLoginOtp(user.email);

  return {
    email: user.email,
    message: "OTP sent to Google account email",
    sent: otpResult.sent,
    otp: otpResult.otp,
  };
};
