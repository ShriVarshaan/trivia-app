import { createBrowserRouter, RouterProvider, Link, Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { socket } from "./config/socket.js";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Otp from "./pages/Otp";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import Room from "./pages/Room";
import Leaderboard from "./pages/Leaderboard";

import Navbar from "./components/Navbar";

const Layout = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (isAuthenticated && user && user.verified === false && location.pathname !== '/otp' && location.pathname !== '/login' && location.pathname !== '/signup') {
    return <Navigate to="/otp" replace />;
  }

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Search from "./pages/Search";
import Friends from "./pages/Friends";

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
        path: "otp",
        element: <Otp />
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
      },
      {
        path: "profile",
        element: <Profile />
      },
      {
        path: "profile/:username",
        element: <PublicProfile />
      },
      {
        path: "search",
        element: <Search />
      },
      {
        path: "friends",
        element: <Friends />
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