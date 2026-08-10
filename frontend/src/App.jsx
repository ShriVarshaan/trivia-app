import { createBrowserRouter, RouterProvider, Link, Outlet } from "react-router-dom";
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

  
  return (
    <RouterProvider router={router} />
  )
}