import React from "react";

import ReactDOM from "react-dom/client";

import {
  BrowserRouter
} from "react-router-dom";

import App from "./App";

import "./index.css";

import {
  ToastContainer
} from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import {
  AuthProvider
} from "./context/AuthContext";

ReactDOM
  .createRoot(
    document.getElementById("root")
  )
  .render(

    <React.StrictMode>

      <BrowserRouter>

        {/* AUTH CONTEXT */}
        <AuthProvider>

          <App />

          {/* TOASTIFY */}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            pauseOnHover
            draggable
            theme="dark"
          />

        </AuthProvider>

      </BrowserRouter>

    </React.StrictMode>
  );