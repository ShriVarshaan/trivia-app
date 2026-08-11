import { createBrowserRouter, RouterProvider, Link, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { socket } from "./config/socket.js";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/signup",
    element: <Signup />
  },
  {
    path: "/",
    element: <Home />
  },
  {
    path: "/create-room",
    element: <CreateRoom />
  },
  {
    path: "/join-room",
    element: <JoinRoom />
  }
]);

export default function App(){

  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect when authenticated
      socket.connect();
    } else {
      // Disconnect when logged out
      if (socket.connected) {
        socket.disconnect();
      }
    }

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user]);

  return (
    <RouterProvider router={router} />
  )
}