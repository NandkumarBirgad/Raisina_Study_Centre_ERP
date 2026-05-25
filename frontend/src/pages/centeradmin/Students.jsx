import { useEffect, useMemo, useState } from "react";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";

function Students() {
  const { user } = useAuth();

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    studentType: "ALL",
    status: "ALL",
    facility: "ALL",
  });

  const canViewStudents =
    user?.role === "CENTER_ADMIN" || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (canViewStudents) {
      fetchStudents();
    }
  }, [canViewStudents]);

  const fetchStudents = async () => {
    setStudentsLoading(true);
    setError("");

    try {
      const response = await API.get("/students");

      const studentsData =
        response?.data?.data?.students ||
        response?.data?.students ||
        response?.data?.data ||
        response?.data ||
        [];

      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (err) {
      console.error("Fetch students failed:", err);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to load students.";

      setError(errorMessage);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      studentType: "ALL",
      status: "ALL",
      facility: "ALL",
    });
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const searchText = filters.search.toLowerCase().trim();

      const searchableData = [
        getStudentName(student),
        student?.rscNumber,
        student?.mobileNumber,
        student?.phone,
        student?.contactNumber,
        getStudentCenter(student),
        student?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchText || searchableData.includes(searchText);

      const matchesType =
        filters.studentType === "ALL" ||
        student?.studentType === filters.studentType;

      const status = getStudentStatus(student);

      const matchesStatus =
        filters.status === "ALL" || status === filters.status;

      const matchesFacility =
        filters.facility === "ALL" ||
        hasFacility(student, filters.facility);

      return matchesSearch && matchesType && matchesStatus && matchesFacility;
    });
  }, [students, filters]);

  const stats = useMemo(() => {
    const totalStudents = students.length;

    const scholarshipStudents = students.filter(
      (student) => student?.studentType === "SCHOLARSHIP"
    ).length;

    const nonScholarshipStudents = students.filter(
      (student) => student?.studentType === "NON_SCHOLARSHIP"
    ).length;

    const hostelStudents = students.filter((student) =>
      hasFacility(student, "HOSTEL")
    ).length;

    const messStudents = students.filter((student) =>
      hasFacility(student, "MESS")
    ).length;

    const libraryMembers = students.filter((student) =>
      hasFacility(student, "LIBRARY")
    ).length;

    return [
      {
        label: "Total Students",
        value: totalStudents,
        helper: "Active student records",
      },
      {
        label: "Scholarship Students",
        value: scholarshipStudents,
        helper: "Admitted through scholarship flow",
      },
      {
        label: "Non-Scholarship Students",
        value: nonScholarshipStudents,
        helper: "Regular admissions",
      },
      {
        label: "Hostel Students",
        value: hostelStudents,
        helper: "Using hostel facility",
      },
      {
        label: "Mess Students",
        value: messStudents,
        helper: "Using mess facility",
      },
      {
        label: "Library Members",
        value: libraryMembers,
        helper: "Using library facility",
      },
    ];
  }, [students]);

  if (!canViewStudents) {
    return (
      <div className="access-denied-card">
        <h2>Students Module Locked</h2>
        <p>
          Your current role <strong>{user?.role || "UNKNOWN"}</strong> does not
          have permission to view student records.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Students"
        subtitle="View, search and manage student records across admissions, facilities and accounts."
        breadcrumb={["Students"]}
      />

      {error && <div className="alert warning">{error}</div>}

      <section className="stats-grid">
        {stats.map((item) => (
          <div className="stat-card" key={item.label}>
            <p>{item.label}</p>
            <h2>{item.value}</h2>
            <span>{item.helper}</span>
          </div>
        ))}
      </section>

      <section className="panel-card students-directory-card">
        <div className="panel-header">
          <div>
            <h2>Student Directory</h2>
            <p>
              Students should be created through the Admissions flow. This page
              is for records, tracking and review.
            </p>
          </div>

          <button className="secondary-btn" onClick={fetchStudents}>
            {studentsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="filter-bar">
          <div className="filter-group large-filter">
            <label>Search Student</label>
            <input
              type="text"
              name="search"
              placeholder="Search by name, RSC no, phone or center"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-group">
            <label>Student Type</label>
            <select
              name="studentType"
              value={filters.studentType}
              onChange={handleFilterChange}
            >
              <option value="ALL">All Types</option>
              <option value="SCHOLARSHIP">Scholarship</option>
              <option value="NON_SCHOLARSHIP">Non-Scholarship</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Facility</label>
            <select
              name="facility"
              value={filters.facility}
              onChange={handleFilterChange}
            >
              <option value="ALL">All Facilities</option>
              <option value="HOSTEL">Hostel</option>
              <option value="MESS">Mess</option>
              <option value="LIBRARY">Library</option>
            </select>
          </div>

          <button className="secondary-btn filter-clear-btn" onClick={clearFilters}>
            Clear
          </button>
        </div>

        <div className="table-meta-row">
          <p>
            Showing <strong>{filteredStudents.length}</strong> of{" "}
            <strong>{students.length}</strong> students
          </p>
        </div>

        {studentsLoading ? (
          <div className="empty-state">
            <h4>Loading students...</h4>
            <p>Please wait while student records are fetched.</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <h4>No students found</h4>
            <p>
              Student records will appear here after admissions are completed.
            </p>
          </div>
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>RSC No</th>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Center</th>
                  <th>Facilities</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <span className="table-role-badge">
                        {student?.rscNumber || "Pending"}
                      </span>
                    </td>

                    <td>
                      <div className="student-cell">
                        <strong>{getStudentName(student)}</strong>
                        <span>{student?.email || "No email added"}</span>
                      </div>
                    </td>

                    <td>{formatLabel(student?.studentType || "N/A")}</td>

                    <td>{getStudentCenter(student)}</td>

                    <td>
                      <div className="facility-chip-group">
                        {getFacilities(student).length === 0 ? (
                          <span className="muted-text">None</span>
                        ) : (
                          getFacilities(student).map((facility) => (
                            <span className="facility-chip" key={facility}>
                              {facility}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${getStatusClass(
                          getStudentStatus(student)
                        )}`}
                      >
                        {formatLabel(getStudentStatus(student))}
                      </span>
                    </td>

                    <td>
                      {student?.mobileNumber ||
                        student?.phone ||
                        student?.contactNumber ||
                        "N/A"}
                    </td>

                    <td>
                      <button
                        className="table-action-btn"
                        onClick={() => setSelectedStudent(student)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedStudent && (
        <div className="modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="student-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{getStudentName(selectedStudent)}</h2>
                <p>{selectedStudent?.rscNumber || "RSC number pending"}</p>
              </div>

              <button
                className="modal-close-btn"
                onClick={() => setSelectedStudent(null)}
              >
                ×
              </button>
            </div>

            <div className="student-detail-grid">
              <DetailItem
                label="Student Type"
                value={formatLabel(selectedStudent?.studentType || "N/A")}
              />
              <DetailItem
                label="Status"
                value={formatLabel(getStudentStatus(selectedStudent))}
              />
              <DetailItem
                label="Center"
                value={getStudentCenter(selectedStudent)}
              />
              <DetailItem
                label="Phone"
                value={
                  selectedStudent?.mobileNumber ||
                  selectedStudent?.phone ||
                  selectedStudent?.contactNumber ||
                  "N/A"
                }
              />
              <DetailItem
                label="Email"
                value={selectedStudent?.email || "N/A"}
              />
              <DetailItem
                label="Date of Birth"
                value={formatDate(
                  selectedStudent?.dob || selectedStudent?.dateOfBirth
                )}
              />
              <DetailItem
                label="Admission Date"
                value={formatDate(selectedStudent?.admissionDate)}
              />
              <DetailItem
                label="Facilities"
                value={
                  getFacilities(selectedStudent).length > 0
                    ? getFacilities(selectedStudent).join(", ")
                    : "None"
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getStudentName(student) {
  return (
    student?.studentName ||
    student?.fullName ||
    student?.name ||
    "Unnamed Student"
  );
}

function getStudentCenter(student) {
  return (
    student?.center?.centerName ||
    student?.center?.name ||
    student?.centerName ||
    "Assigned Center"
  );
}

function getStudentStatus(student) {
  return student?.status || student?.admissionStatus || "ACTIVE";
}

function getFacilities(student) {
  const facilities = [];

  if (
    student?.hostelFacility === true ||
    student?.facilities?.hostel === true ||
    student?.hostel === true
  ) {
    facilities.push("Hostel");
  }

  if (
    student?.messFacility === true ||
    student?.facilities?.mess === true ||
    student?.mess === true
  ) {
    facilities.push("Mess");
  }

  if (
    student?.libraryFacility === true ||
    student?.facilities?.library === true ||
    student?.library === true
  ) {
    facilities.push("Library");
  }

  return facilities;
}

function hasFacility(student, facility) {
  const facilities = getFacilities(student).map((item) => item.toUpperCase());
  return facilities.includes(facility);
}

function formatLabel(value) {
  return String(value || "N/A")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status) {
  const value = String(status || "").toUpperCase();

  if (value === "ACTIVE" || value === "CONFIRMED") return "success";
  if (value === "PENDING") return "warning";
  if (value === "INACTIVE" || value === "CANCELLED") return "danger";

  return "neutral";
}

export default Students;