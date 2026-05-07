import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { setAuth } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      
      setAuth(data.token, data.username);
      navigate("/");
    } catch (err) {
      alert((err as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 gap-x-16">
  {/* LEFT SIDE */}
  <div className="text-center">
    <div className="mb-4">
      <img src="/logo1.png" alt="City Engineering Office" className="w-80 h-80 mx-auto" />
    </div>
    <h1 className="text-3xl font-bold mb-2">
      City Engineer's Office Inventory Management System
    </h1>
    <p className="text-gray-600 mb-8">
      
    </p>
  </div>
      <div className="bg-white p-8 rounded shadow-accent-foreground max-w-md w-full border-accent-foreground border">
        <h2 className="text-xl font-semibold mb-4">Admin</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded pr-10" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <Link to="/forgot-password" className="text-sm text-blue-600">Forgot password?</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
