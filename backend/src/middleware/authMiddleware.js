import { userCreationJoi, userLoginJoi } from "../models/User.js";

export function validateLogin(req, res, next){

    const {error} = userLoginJoi.validate(req.body);

    if (error){
        return res.status(400).json({message: error.details[0].message})
    }

    next();
}

export function validateSignup(req, res, next){

    const {error} = userCreationJoi.validate(req.body);

    if (error){
        return res.status(400).json({message: error.details[0].message})
    }

    next();
}
