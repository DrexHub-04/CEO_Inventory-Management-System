import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Products from "./components/Products";
import AddProduct from "./components/AddProduct";
import EditProduct from "./components/EditProduct";
import Unserviceable from "./components/Unserviceable";
import Categories from "./components/Categories";
import History from "./components/History";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import { isAuthenticated } from "./utils/auth";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/forgot-password", Component: ForgotPassword },
  {
    path: "/",
    Component: Layout,
    loader: async () => {
      if (!isAuthenticated()) {
        throw new Response(null, { status: 302, headers: { Location: "/login" } });
      }
      return null;
    },
    children: [
      { index: true, Component: Dashboard },
      { path: "products", Component: Products },
      { path: "products/add", Component: AddProduct },
      { path: "products/edit/:id", Component: EditProduct },      { path: "unserviceable", Component: Unserviceable },      { path: "categories", Component: Categories },
      { path: "history", Component: History },
    ],
  },
]);
