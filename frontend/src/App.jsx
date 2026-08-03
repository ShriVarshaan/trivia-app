import { createBrowserRouter, RouterProvider, Link, Outlet } from "react-router-dom";
import Login from "./pages/Login";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
]);

export default function App(){

  
  return (
    <RouterProvider router={router} />
  )
}