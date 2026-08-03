import { createBrowserRouter, RouterProvider, Link, Outlet } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";

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
  }
]);

export default function App(){

  
  return (
    <RouterProvider router={router} />
  )
}