import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_DEPARTMENTS, getServerBaseUrl } from "../lib/departments";
import Logo from "../components/ui/Logo";

const MotionDiv = ({ children, className, style, ...props }) => (
  <div className={className} style={style} {...props}>
    {children}
  </div>
);

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "STAFF",
    department_id: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setIsLoaded(true);
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${getServerBaseUrl()}/api/v1/departments`);
      const data = await response.json();
      if (data.success && data.departments) {
        setDepartments(data.departments);
      } else {
        setDepartments(DEFAULT_DEPARTMENTS);
      }
    } catch (err) {
      console.error("Failed to fetch departments:", err);
      setDepartments(DEFAULT_DEPARTMENTS);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (!formData.department_id) {
      setError("Please select a department.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${getServerBaseUrl()}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          department_id: parseInt(formData.department_id),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Store JWT token and user data
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);

      // Call AuthContext login with role, name, and department_id
      login(data.user.role, data.user.name, data.user.department_id);

      setIsSuccess(true);
    } catch (err) {
      setError("Server error, please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans overflow-hidden relative bg-slate-900">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://www.constructionworld.in/assets/uploads/879eeed86c09426988ae2b82efab24d0.webp"
          alt="IntelliDocX background"
          className={`w-full h-full object-cover blur-md transition-transform duration-10000 ease-out ${
            isLoaded ? "scale-110" : "scale-100"
          }`}
        />
        <div className="absolute inset-0 bg-linear-to-br from-slate-900/70 via-[#00909a]/30 to-slate-900/80"></div>
      </div>

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-4xl h-[650px] flex shadow-[0_40px_100px_rgba(0,0,0,0.6)] rounded-3xl overflow-hidden transition-all duration-1000 transform ${
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}
      >
        {/* Left Panel */}
        <div className="hidden lg:flex w-[40%] bg-slate-800/60 backdrop-blur-xl p-10 flex-col justify-between text-white border-r border-white/10">
          <div>
            <Logo sizeClassName="w-20 h-20" wrapperClassName="mb-10 rounded-full" />
            <h2 className="text-3xl font-black leading-none tracking-tighter mb-4">
              SECURE <br /> <span className="text-[#00909a]">ACCESS PORTAL.</span>
            </h2>
            <p className="text-slate-300 text-xs font-light leading-relaxed">
              Authorized registration for internal administrative and operational personnel.
            </p>
          </div>
          <div className="text-[9px] uppercase tracking-[0.4em] text-white/40 font-bold border-t border-white/10 pt-4">
            Internal System
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-[60%] bg-white p-12 flex flex-col justify-center relative overflow-y-auto">
          {/* SUCCESS OVERLAY */}
          {isSuccess && (
            <div className="absolute inset-0 z-20 bg-white flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-teal-50 text-[#00909a] rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase">Account Registered</h3>
              <p className="text-slate-400 text-[10px] mt-2 mb-8 uppercase tracking-widest">
                Credentials successfully mapped. Entering dashboard.
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-[#00909a] text-white px-10 py-4 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl active:scale-95"
              >
                Enter Dashboard
              </button>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Initialize Account</h1>
            <div className="h-1 w-8 bg-[#00909a] mt-1"></div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Full Name
              </label>
              <input
                required
                type="text"
                className="w-full border-b border-slate-200 py-1 text-sm focus:outline-none focus:border-[#00909a] bg-transparent"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Official Email ID
              </label>
              <input
                required
                type="email"
                className="w-full border-b border-slate-200 py-1 text-sm focus:outline-none focus:border-[#00909a] bg-transparent"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Password
                </label>
                <input
                  required
                  type="password"
                  title="At least 6 characters"
                  className="w-full border-b border-slate-200 py-1 text-sm focus:outline-none focus:border-[#00909a] bg-transparent"
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Confirm
                </label>
                <input
                  required
                  type="password"
                  className="w-full border-b border-slate-200 py-1 text-sm focus:outline-none focus:border-[#00909a] bg-transparent"
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-[9px] uppercase font-bold">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Role
                </label>
                <select
                  className="w-full border-b border-slate-200 py-1 text-sm bg-transparent outline-none focus:border-[#00909a]"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="STAFF">Staff</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Department
                </label>
                <select
                  required
                  className="w-full border-b border-slate-200 py-1 text-sm bg-transparent outline-none focus:border-[#00909a]"
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00909a] text-white py-4 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-900 transition-all shadow-xl mt-4 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register Account"}
            </button>
          </form>

          <p
            onClick={() => navigate("/login")}
            className="mt-6 text-[8px] text-[#00909a] text-center uppercase tracking-widest font-black cursor-pointer hover:underline"
          >
            Already have an account? Sign In
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
