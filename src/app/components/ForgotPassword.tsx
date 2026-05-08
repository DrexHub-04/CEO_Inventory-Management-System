import React, { useState } from "react";
import { Link } from "react-router";
import { Eye, EyeOff } from "lucide-react";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL
        || "https://ceo-inventory-management-system.onrender.com";
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, newPassword }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed");
      }
      
      setResult(data.message || "Password reset successfully! You can now log in with your new password.");
      setUsername("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPopup(true);
    } catch (err) {
      alert((err as Error).message || "Error");
      }
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Forgot Password</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input id="username" name="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input id="newPassword" name="newPassword" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-3 py-2 border rounded pr-10" />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 border rounded pr-10" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Reset Password</button>
            <Link to="/login" className="text-sm text-blue-600">Back to sign in</Link>
          </div>
        </form>
        {showPopup && (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-lg p-6 w-96 text-center">
      <h3 className="text-lg font-semibold text-green-600 mb-2">
        ✅
      </h3>

      <p className="text-gray-600 text-sm mb-6">
        {result}
      </p>

      <button
        onClick={() => {
          setShowPopup(false);
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <Link to="/login">OK</Link>
      </button>
      
    </div>
  </div>
)}
      </div>
    </div>
  );
}
