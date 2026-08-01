import {prisma} from "../src/config/prisma.js";

async function testConnection(){
    const user = await prisma.user.create({
        data: {
            username: "testuser",
            email: "testuser@example.com",
            password: "testpassword"
        }
    })

    console.log("User created:", user);

    const allUsers = await prisma.user.findMany();
    console.log("All users:", allUsers);
}


testConnection()
    .then(() => {
        console.log("Database connection test completed successfully.");
    })
    .catch((err) => {
        console.error("Error during database connection test:", err);
    })