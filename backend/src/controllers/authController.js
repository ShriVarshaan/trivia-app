import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {prisma} from "../config/prisma.js";
import { sendOtpEmail } from "../utils/email.js";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function signup(req, res){
    const {username, email, password} = req.body;

    try{

        //If the user already exists, return an error
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if (user){
            return res.status(400).json({message: "User already exists"})
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const newUser = await prisma.user.create({
            data: {
                username: username,
                email: email,
                password: hashedPassword,
                otp: hashedOtp,
                otp_expires_at: otpExpiresAt,
                verified: false
            }
        })

        try {
            await sendOtpEmail(email, otp);
        } catch (e) {
            console.error("Failed to send OTP email on signup:", e);
        }

        const {password: _, otp: __, otp_expires_at: ___, ...userWithoutPassword} = newUser; //we don't want to send the password back to the client

        const token = jwt.sign({id: newUser.id}, process.env.JWT_SECRET, {expiresIn: "7d"});
        res.status(201).json({message: "User created successfully", user: userWithoutPassword, token: token})
    } catch (error) {
        console.log("Here is the error", error)
        res.status(500).json({message: "Error creating user", error: error.message})
    }
}

export async function login(req, res){

    const {email, password} = req.body;

    try{
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if (!user){
            return res.status(401).json({message: "Invalid credentials"})
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch){
            return res.status(401).json({message: "Invalid credentials"})
        }

        const otp = generateOTP();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const updatedUser = await prisma.user.update({
            where: { email },
            data: { verified: false, otp: hashedOtp, otp_expires_at: otpExpiresAt }
        });

        try {
            await sendOtpEmail(email, otp);
        } catch (e) {
            console.error("Failed to send OTP email on login:", e);
        }
        
        const {password: _, otp: __, otp_expires_at: ___, ...userWithoutPassword} = updatedUser;

        const token = jwt.sign({id: user.id}, process.env.JWT_SECRET, {expiresIn: "7d"});
        res.status(200).json({message: "OTP sent to email", user: userWithoutPassword, token: token})
    } catch (error) {
        res.status(500).json({message: "Error logging in", error: error.message})
    }
}

export async function verifyOtp(req, res) {
    const { email, otp } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.verified) {
            return res.status(400).json({ message: "User is already verified" });
        }
        
        if (!user.otp_expires_at || new Date() > user.otp_expires_at) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        const isOtpValid = await bcrypt.compare(otp, user.otp);
        if (!isOtpValid) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const updatedUser = await prisma.user.update({
            where: { email },
            data: { verified: true, otp: null, otp_expires_at: null }
        });

        const {password: _, otp: __, otp_expires_at: ___, ...userWithoutPassword} = updatedUser;
        res.status(200).json({ message: "Email verified successfully", user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ message: "Error verifying OTP", error: error.message });
    }
}

export async function resendOtp(req, res) {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.verified) {
            return res.status(400).json({ message: "User is already verified" });
        }

        const otp = generateOTP();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.user.update({
            where: { email },
            data: { otp: hashedOtp, otp_expires_at: otpExpiresAt }
        });

        await sendOtpEmail(email, otp);
        res.status(200).json({ message: "OTP resent successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error resending OTP", error: error.message });
    }
}