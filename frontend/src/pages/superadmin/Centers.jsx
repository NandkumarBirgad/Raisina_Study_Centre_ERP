import { useEffect, useMemo, useState } from "react";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";

function Centers() {
  const { user } = useAuth();

  const [centers, setCenters] = useState([]);
  const [formData, setFormData] = useState({
    centerName: "",
    address: "",
    city: "",
    state: "",
    contactNumber: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [centersLoading, setCentersLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCenters();
    }
  }, [isSuperAdmin]);

  const fetchCenters = async () => {
    setCentersLoading(true);
    setError("");

    try {
      const response = await API.get("/centers");

      const centersData =
        response?.data?.data?.centers ||
        response?.data?.centers ||
        response?.data?.data ||
        response?.data ||
        [];

      setCenters(Array.isArray(centersData) ? centersData : []);
    } catch (err) {
      console.error("Fetch centers failed:", err);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to load centers.";

      setError(errorMessage);
    } finally {
      setCentersLoading(false);
    }
  };

  const summary = useMemo(() => {
    const activeCenters = centers.filter((center) => {
      const status = String(center?.status || "ACTIVE").toUpperCase();
      return status === "ACTIVE";
    }).length;

    const centersWithContact = centers.filter(
      (center) => center?.contactNumber || center?.phone
    ).length;

    const centersWithEmail = centers.filter((center) => center?.email).length;

    return {
      totalCenters: centers.length,
      activeCenters,
      centersWithContact,
      centersWithEmail,
    };
  }, [centers]);

  const filteredCenters = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return centers;

    return centers.filter((center) => {
      const searchableText = [
        getCenterName(center),
        getCenterCode(center),
        getCenterLocation(center),
        center?.contactNumber,
        center?.phone,
        center?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [centers, searchTerm]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setFormData({
      centerName: "",
      address: "",
      city: "",
      state: "",
      contactNumber: "",
      email: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        centerName: formData.centerName.trim(),
        name: formData.centerName.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        contactNumber: formData.contactNumber.trim(),
        phone: formData.contactNumber.trim(),
        email: formData.email.trim(),
      };

      await API.post("/centers", payload);

      setMessage("Center created successfully.");
      resetForm();
      fetchCenters();
    } catch (err) {
      console.error("Create center failed:", err);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to create center.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="access-denied-card">
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="centers-page">
      <PageHeader
        title="Centers"
        subtitle="Create, review and manage study centers across the ERP system."
      />

      <section className="stats-grid">
        <SummaryCard
          label="Total Centers"
          value={summary.totalCenters}
          helper="All centers created in the system"
          loading={centersLoading}
        />

        <SummaryCard
          label="Active Centers"
          value={summary.activeCenters}
          helper="Centers currently available for operations"
          loading={centersLoading}
        />

        <SummaryCard
          label="Contact Added"
          value={summary.centersWithContact}
          helper="Centers with phone/contact number"
          loading={centersLoading}
        />

        <SummaryCard
          label="Email Added"
          value={summary.centersWithEmail}
          helper="Centers with email address"
          loading={centersLoading}
        />
      </section>

      {(message || error) && (
        <section>
          {message && <div className="success-box">{message}</div>}
          {error && <div className="error-box">{error}</div>}
        </section>
      )}

      <section className="form-card center-form-card">
        <div className="form-card-header">
          <p className="eyebrow-text">Center Setup</p>
          <h3>Create Center</h3>
          <p>
            Add a study center first. After that, assign a center admin from the
            Center Admins page.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-row">
            <div className="form-group">
              <label>Center Name</label>
              <input
                type="text"
                name="centerName"
                placeholder="Enter center name"
                value={formData.centerName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Contact Number</label>
              <input
                type="text"
                name="contactNumber"
                placeholder="Enter contact number"
                value={formData.contactNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              name="address"
              placeholder="Enter center address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                name="city"
                placeholder="Enter city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>State</label>
              <input
                type="text"
                name="state"
                placeholder="Enter state"
                value={formData.state}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter center email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={resetForm}
              disabled={loading}
            >
              Clear
            </button>

            <button
              type="submit"
              className="primary-btn center-submit-btn"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Center"}
            </button>
          </div>
        </form>
      </section>

      <section className="table-card">
        <div className="table-header">
          <div>
            <h3>All Centers</h3>
            <p>
              Showing {filteredCenters.length} of {centers.length} center
              {centers.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="navbar-actions">
            <input
              className="table-search"
              type="text"
              placeholder="Search center..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <button
              className="secondary-btn"
              onClick={fetchCenters}
              disabled={centersLoading}
            >
              {centersLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {centersLoading ? (
          <EmptyState title="Loading centers..." message="Please wait." />
        ) : centers.length === 0 ? (
          <EmptyState
            title="No centers found"
            message="Create your first center using the form above."
          />
        ) : filteredCenters.length === 0 ? (
          <EmptyState
            title="No matching center found"
            message="Try searching by center name, code, city, contact number or email."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Center</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredCenters.map((center) => (
                  <tr key={getCenterId(center)}>
                    <td>
                      <div className="student-cell">
                        <strong>{getCenterName(center)}</strong>
                        <span>{center?.address || "Address not added"}</span>
                      </div>
                    </td>

                    <td>
                      <span className="table-role-badge">
                        {getCenterCode(center)}
                      </span>
                    </td>

                    <td>{getCenterLocation(center)}</td>

                    <td>{center?.contactNumber || center?.phone || "N/A"}</td>

                    <td>{center?.email || "N/A"}</td>

                    <td>
                      <span
                        className={`status-badge ${getCenterStatusClass(
                          center
                        )}`}
                      >
                        {formatLabel(center?.status || "ACTIVE")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, helper, loading }) {
  return (
    <div className="stat-card">
      <p>{label}</p>
      <h2>{loading ? "..." : value}</h2>
      <span>{helper}</span>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <h4>{title}</h4>
      <p>{message}</p>
    </div>
  );
}

function getCenterId(center) {
  return center?._id || center?.id || getCenterName(center);
}

function getCenterName(center) {
  return center?.centerName || center?.name || "Unnamed Center";
}

function getCenterCode(center) {
  return center?.centerCode || center?.code || "Auto";
}

function getCenterLocation(center) {
  const city = center?.city || "";
  const state = center?.state || "";

  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;

  return center?.address || "Not added";
}

function getCenterStatusClass(center) {
  const status = String(center?.status || "ACTIVE").toUpperCase();

  if (status === "ACTIVE") return "success";
  if (status === "INACTIVE") return "danger";

  return "neutral";
}

function formatLabel(value) {
  return String(value || "N/A")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default Centers;