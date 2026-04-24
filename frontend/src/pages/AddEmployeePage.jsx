import React, { useState, useEffect, useContext } from "react";

import { UserPlus, User, Lock, Briefcase, Building2, Mail } from "lucide-react";

import InputWithIcon from "../components/ui/input-with-icon";
import Button from "../components/ui/button";
import FormGroup from "../components/ui/formGroup";
import Card from "../components/ui/card";

import { useAuth } from "../context/AuthContext";
import { TranslationContext } from "../context/TranslationContext";
import { DEFAULT_DEPARTMENTS, getServerBaseUrl } from "../lib/departments";

const AddEmployeePage = () => {
  const { role, departmentId, loading: authLoading } = useAuth();
  const { t } = useContext(TranslationContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    employeeType: "",
    department: "",
  });

  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  console.log("ROLE:", role);
  console.log("DEPARTMENT ID:", departmentId);
  console.log("AUTH LOADING:", authLoading);

  // PREFILL when AuthContext is ready
  useEffect(() => {
    if (authLoading) return;

    setFormData({
      name: "",
      email: "",
      password: "",
      employeeType: role === "DEPARTMENT_HEAD" ? "STAFF" : "",
      department: role === "DEPARTMENT_HEAD" ? departmentId : "",
    });

    setInitialized(true);
  }, [authLoading, role, departmentId]);

  // FETCH DEPARTMENTS
  useEffect(() => {
    const API_BASE = getServerBaseUrl();
    const token = localStorage.getItem("token");

    fetch(`${API_BASE}/api/v1/departments`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch departments");
        return res.json();
      })
      .then((data) => {
        console.log("Fetched departments:", data.departments);
        setAvailableDepartments(data.departments || DEFAULT_DEPARTMENTS);
      })
      .catch((err) => {
        console.error("Error fetching departments:", err);
        setAvailableDepartments(DEFAULT_DEPARTMENTS);
      });
  }, []);

  // EMPLOYEE TYPES BASED ON ROLE
  const employeeTypes =
    role === "ADMIN"
      ? [
          { value: "DEPARTMENT_HEAD", label: t("admin") },
          { value: "STAFF", label: t("employee") },
        ]
      : [{ value: "STAFF", label: t("employee") }];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  // SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");
    setSuccess("");

    const API_BASE = getServerBaseUrl();

    // VALIDATION
    if (!formData.name.trim()) {
      setError(t("enterName"));
      setSubmitLoading(false);
      return;
    }
    if (!formData.email.trim()) {
      setError(t("enterEmail"));
      setSubmitLoading(false);
      return;
    }
    if (!formData.password.trim()) {
      setError(t("enterPassword"));
      setSubmitLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError(t("passwordMustBe"));
      setSubmitLoading(false);
      return;
    }
    if (!formData.employeeType) {
      setError(t("selectRoleRequired"));
      setSubmitLoading(false);
      return;
    }
    if (!formData.department) {
      setError(t("departmentRequired"));
      setSubmitLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.employeeType,
          department_id: parseInt(formData.department),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("registrationFailed"));
      }

      setSuccess(t("employeeAddedSuccessfully"));

      setFormData({
        name: "",
        email: "",
        password: "",
        employeeType: role === "DEPARTMENT_HEAD" ? "STAFF" : "",
        department: role === "DEPARTMENT_HEAD" ? departmentId : "",
      });

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!initialized) return null; // Wait until prefilled

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      <Card className="p-6 sm:p-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <UserPlus className="text-blue-600" /> {t("addEmployee")}
        </h1>
      </Card>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          <FormGroup label={t("name")}>
            <InputWithIcon
              icon={User}
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t("enterName")}
              required
            />
          </FormGroup>

          <FormGroup label={t("email")}>
            <InputWithIcon
              icon={Mail}
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t("enterEmail")}
              required
            />
          </FormGroup>

          <FormGroup label={t("password")}>
            <InputWithIcon
              icon={Lock}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={t("enterPassword")}
              required
            />
          </FormGroup>

          <FormGroup label={t("employeeType")}>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                name="employeeType"
                value={formData.employeeType}
                onChange={handleChange}
                disabled={role === "DEPARTMENT_HEAD"}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              >
                <option value="">{t("selectRole")}</option>
                {employeeTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </FormGroup>

          <FormGroup label={t("department")}>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={role === "DEPARTMENT_HEAD"}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              >
                <option value="">{t("selectDepartment")}</option>
                {availableDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </FormGroup>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <Button type="submit" disabled={submitLoading} className="w-full">
            {submitLoading ? t("adding") : t("addEmployee")}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AddEmployeePage;
