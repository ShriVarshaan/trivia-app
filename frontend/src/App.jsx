import { createBrowserRouter, RouterProvider, Link, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { socket } from "./config/socket.js";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import Room from "./pages/Room";
import Leaderboard from "./pages/Leaderboard";

import Navbar from "./components/Navbar";

const Layout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "login",
        element: <Login />
      },
      {
        path: "signup",
        element: <Signup />
      },
      {
        index: true,
        element: <Home />
      },
      {
        path: "create-room",
        element: <CreateRoom />
      },
      {
        path: "join-room",
        element: <JoinRoom />
      },
      {
        path: "room/:roomId",
        element: <Room />
      },
      {
        path: "room/:roomId/leaderboard",
        element: <Leaderboard />
      }
    ]
  }
]);

export default function App(){

  const { isAuthenticated, user, token } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect when authenticated

      socket.auth = { token };
      socket.user = user;

      if(!socket.connected){
        socket.connect();
      }
    } else {
      // Disconnect when logged out
      if (socket.connected) {
        socket.disconnect();
      }
    }

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id, token]);

  return (
    <div className="app-container">
      <RouterProvider router={router} />
    </div>
  )
}