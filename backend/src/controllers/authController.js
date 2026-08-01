import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {prisma} from "../config/prisma.js"

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

        const newUser = await prisma.user.create({
            data: {
                username: username,
                email: email,
                password: hashedPassword //we store the hashed password
            }
        })

        const {password: _, ...userWithoutPassword} = newUser; //we don't want to send the password back to the client

        const token = jwt.sign({id: newUser.id}, process.env.JWT_SECRET, {expiresIn: "7d"});
        res.status(201).json({message: "User created successfully", user: userWithoutPassword, token: token})
    } catch (error) {
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
        
        const {password: _, ...userWithoutPassword} = user;

        const token = jwt.sign({id: user.id}, process.env.JWT_SECRET, {expiresIn: "7d"});
        res.status(200).json({message: "Login successful", user: userWithoutPassword, token: token})
    } catch (error) {
        res.status(500).json({message: "Error logging in", error: error.message})
    }
}