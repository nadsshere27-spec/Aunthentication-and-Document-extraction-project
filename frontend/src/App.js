import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/login/login";
import Register from "./pages/register/register";
import ForgotPassword from "./pages/forgotpassword/forgotpassword";
import ResetPassword from "./pages/resetpassword/resetpassword";
import Dashboard from "./pages/dashboard/dashboard";
import UploadCV from "./pages/uploadcv/uploadcv";
import ApplicationForm from "./pages/applicationform/applicationform";
import Admin from "./pages/admin/Admin";
import EditApplication from "./pages/admin/EditApplication";
import CodeEditor from "./pages/CodeEditor";
import Profile from "./pages/profile/Profile";
import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route
          path="/dashboard"
          element={
            <Layout title="Dashboard">
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/upload-cv"
          element={
            <Layout title="Upload CV">
              <UploadCV />
            </Layout>
          }
        />
        <Route
          path="/application-form"
          element={
            <Layout title="Application Form">
              <ApplicationForm />
            </Layout>
          }
        />
        <Route
          path="/code-editor"
          element={
            <Layout title="Code Editor">
              <CodeEditor />
            </Layout>
          }
        />
        <Route
          path="/profile"
          element={
            <Layout title="My Profile">
              <Profile />
            </Layout>
          }
        />

        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/applications/:id/edit" element={<EditApplication />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;