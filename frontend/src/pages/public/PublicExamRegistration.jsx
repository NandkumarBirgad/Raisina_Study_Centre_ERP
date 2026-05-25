import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";

function PublicExamRegistration() {
  const [centers, setCenters] = useState([]);

  const [form, setForm] = useState({
    fullName: "",
    mobileNumber: "",
    dob: "",
    addressLine: "",
    preferredExamCenter: "",
    preferredAdmissionCenter: "",
    year: new Date().getFullYear(),
  });

  const [loading, setLoading] = useState(false);
  const [centersLoading, setCentersLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    setCentersLoading(true);
    setError("");

    try {
      const res = await API.get("/public/centers");
      setCenters(extractArray(res.data));
    } catch (err) {
      console.error("Unable to load centers:", err);
      setError("Unable to load centers. Please check if backend is running.");
    } finally {
      setCentersLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setError("");
    setResult(null);
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      mobileNumber: "",
      dob: "",
      addressLine: "",
      preferredExamCenter: "",
      preferredAdmissionCenter: "",
      year: new Date().getFullYear(),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        fullName: form.fullName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        dob: form.dob,
        addressLine: form.addressLine.trim(),

        // New fields
        preferredExamCenter: form.preferredExamCenter,
        preferredAdmissionCenter: form.preferredAdmissionCenter,

        // Temporary backward compatibility for old backend
        preferredCenter: form.preferredExamCenter,

        year: Number(form.year),
      };

      const res = await API.post("/public/exam-register", payload);

      setResult(res.data?.data || res.data);
      resetForm();
    } catch (err) {
      console.error("Registration failed:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Registration failed. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exam-page">
      <nav className="exam-navbar">
        <div className="exam-brand">Study Center ERP</div>

        <Link to="/login" className="exam-login-btn">
          Admin Login
        </Link>
      </nav>

      <main className="exam-container">
        <div className="exam-layout">
          <section className="exam-info-card">
            <div className="exam-badge">Scholarship Exam</div>

            <h1>Scholarship Exam Registration</h1>

            <p>
              Register for the offline scholarship exam. After the result, the
              merit list will be used for scholarship-based admission.
            </p>
          </section>

          <section className="exam-form-card">
            <h2>Student Registration</h2>
            <p>Enter student details carefully.</p>

            {error && <div className="alert alert-error">{error}</div>}

            {result && (
              <div className="alert alert-success">
                <strong>Registration successful!</strong>
                <br />
                Registration No:{" "}
                <strong>{result.registrationNumber || "Generated"}</strong>
              </div>
            )}

            <form className="exam-form" onSubmit={handleSubmit}>
              <div className="exam-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Enter student full name"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="exam-form-row">
                <div className="exam-form-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    name="mobileNumber"
                    placeholder="Enter mobile number"
                    value={form.mobileNumber}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="exam-form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="exam-form-group">
                <label>Address</label>
                <textarea
                  name="addressLine"
                  placeholder="Enter student address"
                  value={form.addressLine}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="exam-form-row">
                <div className="exam-form-group">
                  <label>Preferred Exam Center</label>
                  <select
                    name="preferredExamCenter"
                    value={form.preferredExamCenter}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      {centersLoading
                        ? "Loading centers..."
                        : "Select exam center"}
                    </option>

                    {centers.map((center) => (
                      <option key={getCenterId(center)} value={getCenterId(center)}>
                        {getCenterLabel(center)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="exam-form-group">
                  <label>Preferred Admission Center</label>
                  <select
                    name="preferredAdmissionCenter"
                    value={form.preferredAdmissionCenter}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      {centersLoading
                        ? "Loading centers..."
                        : "Select admission center"}
                    </option>

                    {centers.map((center) => (
                      <option key={getCenterId(center)} value={getCenterId(center)}>
                        {getCenterLabel(center)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="exam-form-group">
                <label>Exam Year</label>
                <input
                  type="number"
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                className="exam-submit-btn"
                type="submit"
                disabled={loading || centersLoading}
              >
                {loading ? "Submitting..." : "Submit Registration"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

function extractArray(payload) {
  const data = payload?.data || payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.centers)) return data.centers;

  return [];
}

function getCenterId(center) {
  return center?._id || center?.id;
}

function getCenterName(center) {
  return center?.centerName || center?.name || "Unnamed Center";
}

function getCenterCode(center) {
  return center?.centerCode || center?.code || "";
}

function getCenterLabel(center) {
  const name = getCenterName(center);
  const code = getCenterCode(center);
  const city = center?.city;

  return `${name}${code ? ` (${code})` : ""}${city ? ` - ${city}` : ""}`;
}

export default PublicExamRegistration;