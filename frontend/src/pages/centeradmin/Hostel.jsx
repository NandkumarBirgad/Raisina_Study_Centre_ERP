import { useEffect, useMemo, useState } from "react";
import API from "../../api/api";

function Hostel() {
  const [activeTab, setActiveTab] = useState("overview");

  const [hostels, setHostels] = useState([]);
  const [hostelStudents, setHostelStudents] = useState([]);
  const [allocations, setAllocations] = useState([]);

  const [selectedHostelId, setSelectedHostelId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [allocationForm, setAllocationForm] = useState({
    roomNumber: "",
    bedNumber: "",
    joiningDate: "",
    monthlyFee: "",
  });

  const [hostelForm, setHostelForm] = useState({
    name: "",
    type: "Boys",
    address: "",
    totalRooms: "",
    bedsPerRoom: "",
    monthlyFee: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [savingHostel, setSavingHostel] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "hostels", label: "Hostel Management" },
    { key: "allocation", label: "Student Allocation" },
    { key: "students", label: "Hostel Students" },
  ];

  useEffect(() => {
    fetchHostelData();
  }, []);

  const getArray = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (Array.isArray(responseData?.data)) return responseData.data;
    return [];
  };

  const getId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id || "";
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
  };

  const formatCurrency = (amount) => {
    return `₹ ${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const fetchHostelData = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [hostelsRes, studentsRes, allocationsRes] = await Promise.all([
        API.get("/hostels"),
        API.get("/hostels/eligible-students"),
        API.get("/hostels/allocations"),
      ]);

      setHostels(getArray(hostelsRes.data));
      setHostelStudents(getArray(studentsRes.data));
      setAllocations(getArray(allocationsRes.data));
    } catch (err) {
      console.error("Hostel data fetch error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load hostel data. Please check backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const activeAllocations = useMemo(() => {
    return allocations.filter((record) => record.status === "ACTIVE");
  }, [allocations]);

  const assignedStudentIds = useMemo(() => {
    return activeAllocations.map((record) => String(getId(record.student)));
  }, [activeAllocations]);

  const unassignedStudents = useMemo(() => {
    return hostelStudents.filter((student) => {
      const studentId = String(student._id);
      return !assignedStudentIds.includes(studentId) && !student.hostel;
    });
  }, [hostelStudents, assignedStudentIds]);

  const selectedHostel = useMemo(() => {
    return hostels.find(
      (hostel) => String(hostel._id) === String(selectedHostelId)
    );
  }, [hostels, selectedHostelId]);

  const selectedStudent = useMemo(() => {
    return hostelStudents.find(
      (student) => String(student._id) === String(selectedStudentId)
    );
  }, [hostelStudents, selectedStudentId]);

  const totalCapacity = useMemo(() => {
    return hostels.reduce(
      (sum, hostel) => sum + Number(hostel.capacity || 0),
      0
    );
  }, [hostels]);

  const occupiedBeds = activeAllocations.length;
  const availableBeds = Math.max(totalCapacity - occupiedBeds, 0);

  const selectedHostelOccupied = useMemo(() => {
    if (!selectedHostelId) return 0;

    return activeAllocations.filter(
      (record) => String(getId(record.hostel)) === String(selectedHostelId)
    ).length;
  }, [activeAllocations, selectedHostelId]);

  const selectedHostelAvailable = selectedHostel
    ? Math.max(Number(selectedHostel.capacity || 0) - selectedHostelOccupied, 0)
    : 0;

  const recentAllocations = activeAllocations.slice(0, 5);

  const handleAllocationChange = (e) => {
    setAllocationForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleHostelChange = (e) => {
    setHostelForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleHostelSelect = (e) => {
    const hostelId = e.target.value;
    setSelectedHostelId(hostelId);

    const hostel = hostels.find((item) => String(item._id) === String(hostelId));

    setAllocationForm((prev) => ({
      ...prev,
      monthlyFee: hostel?.monthlyFee || "",
    }));
  };

  const resetAllocationForm = () => {
    setSelectedHostelId("");
    setSelectedStudentId("");
    setAllocationForm({
      roomNumber: "",
      bedNumber: "",
      joiningDate: "",
      monthlyFee: "",
    });
  };

  const resetHostelForm = () => {
    setHostelForm({
      name: "",
      type: "Boys",
      address: "",
      totalRooms: "",
      bedsPerRoom: "",
      monthlyFee: "",
    });
  };

  const handleCreateHostel = async (e) => {
    e.preventDefault();

    try {
      setSavingHostel(true);
      setError("");
      setMessage("");

      await API.post("/hostels", {
        name: hostelForm.name,
        type: hostelForm.type,
        address: hostelForm.address,
        totalRooms: hostelForm.totalRooms,
        bedsPerRoom: hostelForm.bedsPerRoom,
        monthlyFee: hostelForm.monthlyFee,
      });

      setMessage("Hostel created successfully.");
      resetHostelForm();
      fetchHostelData();
    } catch (err) {
      console.error("Create hostel error:", err);
      setError(err.response?.data?.message || "Unable to create hostel.");
    } finally {
      setSavingHostel(false);
    }
  };

  const handleAssignHostel = async (e) => {
    e.preventDefault();

    if (!selectedHostelId) {
      setError("Please select a hostel.");
      return;
    }

    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    try {
      setSavingAllocation(true);
      setError("");
      setMessage("");

      await API.post(`/hostels/${selectedHostelId}/allocate`, {
        studentId: selectedStudentId,
        roomNumber: allocationForm.roomNumber,
        bedNumber: allocationForm.bedNumber,
        joiningDate: allocationForm.joiningDate,
        monthlyFee: allocationForm.monthlyFee,
      });

      setMessage("Hostel room assigned successfully.");
      resetAllocationForm();
      fetchHostelData();
    } catch (err) {
      console.error("Hostel assign error:", err);
      setError(err.response?.data?.message || "Unable to assign hostel room.");
    } finally {
      setSavingAllocation(false);
    }
  };

  const handleDeallocate = async (record) => {
    try {
      setError("");
      setMessage("");

      const hostelId = getId(record.hostel);
      const studentId = getId(record.student);

      await API.post(`/hostels/${hostelId}/deallocate`, {
        studentId,
        remarks: "Marked as left from hostel page",
      });

      setMessage("Student deallocated from hostel.");
      fetchHostelData();
    } catch (err) {
      console.error("Hostel deallocate error:", err);
      setError(err.response?.data?.message || "Unable to deallocate student.");
    }
  };

  return (
    <div className="module-page">
      <section className="page-header-card">
        <span className="page-tag">HOSTEL MODULE</span>
        <h2>Hostel Management</h2>
        <p>
          Create hostels, assign rooms and beds, and track occupied and
          available hostel capacity.
        </p>
      </section>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div
        className="dashboard-tabs"
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          margin: "20px 0",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? "primary-btn" : "secondary-btn"}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-card">Loading hostel data...</div>
      ) : (
        <>
          {activeTab === "overview" && (
            <section className="dashboard-grid">
              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Hostel Overview</h2>
                    <p>Current hostel capacity status</p>
                  </div>
                </div>

                <div className="action-list">
                  <SummaryRow
                    title="Total Hostels"
                    description="Hostel records created"
                    value={hostels.length}
                  />

                  <SummaryRow
                    title="Total Capacity"
                    description="Total available bed capacity"
                    value={totalCapacity}
                  />

                  <SummaryRow
                    title="Occupied Beds"
                    description="Currently assigned students"
                    value={occupiedBeds}
                  />

                  <SummaryRow
                    title="Available Beds"
                    description="Remaining hostel capacity"
                    value={availableBeds}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Student Requests</h2>
                    <p>Hostel facility selection and allocation</p>
                  </div>
                </div>

                <div className="action-list">
                  <SummaryRow
                    title="Hostel Facility Students"
                    description="Students who selected hostel facility"
                    value={hostelStudents.length}
                  />

                  <SummaryRow
                    title="Assigned Students"
                    description="Students with active hostel allocation"
                    value={activeAllocations.length}
                  />

                  <SummaryRow
                    title="Pending Allocation"
                    description="Students not yet assigned hostel"
                    value={unassignedStudents.length}
                  />
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Jump to common hostel tasks</p>
                  </div>
                </div>

                <div className="action-list">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("hostels")}
                  >
                    Create / View Hostels
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("allocation")}
                  >
                    Assign Hostel Room
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveTab("students")}
                  >
                    View Hostel Students
                  </button>
                </div>
              </div>

              <div className="panel-card wide-card">
                <div className="panel-header">
                  <div>
                    <h2>Recent Hostel Allocations</h2>
                    <p>Latest active room and bed allotments</p>
                  </div>
                </div>

                {recentAllocations.length === 0 ? (
                  <div className="empty-state">
                    No active hostel allocations yet.
                  </div>
                ) : (
                  <div className="action-list">
                    {recentAllocations.map((record) => (
                      <div className="action-item" key={record._id}>
                        <div>
                          <h4>{record.student?.studentName || "Student"}</h4>
                          <p>
                            {record.hostel?.name || "Hostel"} • Room{" "}
                            {record.roomNumber || "-"} • Bed{" "}
                            {record.bedNumber || "-"}
                          </p>
                        </div>

                        <strong>{record.status}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "hostels" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Create Hostel</h3>
                    <p>Add a hostel master record for this center.</p>
                  </div>

                  <form onSubmit={handleCreateHostel}>
                    <div className="form-group">
                      <label>Hostel Name</label>
                      <input
                        name="name"
                        value={hostelForm.name}
                        onChange={handleHostelChange}
                        placeholder="Example: Boys Hostel A"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Hostel Type</label>
                      <select
                        name="type"
                        value={hostelForm.type}
                        onChange={handleHostelChange}
                      >
                        <option value="Boys">Boys</option>
                        <option value="Girls">Girls</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Address</label>
                      <input
                        name="address"
                        value={hostelForm.address}
                        onChange={handleHostelChange}
                        placeholder="Hostel address"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Total Rooms</label>
                        <input
                          type="number"
                          name="totalRooms"
                          value={hostelForm.totalRooms}
                          onChange={handleHostelChange}
                          placeholder="10"
                          min="1"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Beds Per Room</label>
                        <input
                          type="number"
                          name="bedsPerRoom"
                          value={hostelForm.bedsPerRoom}
                          onChange={handleHostelChange}
                          placeholder="4"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Monthly Fee</label>
                      <input
                        type="number"
                        name="monthlyFee"
                        value={hostelForm.monthlyFee}
                        onChange={handleHostelChange}
                        placeholder="₹"
                      />
                    </div>

                    <button className="primary-btn" disabled={savingHostel}>
                      {savingHostel ? "Creating..." : "Create Hostel"}
                    </button>
                  </form>
                </div>
              </section>

              <HostelTable
                hostels={hostels}
                formatCurrency={formatCurrency}
              />
            </>
          )}

          {activeTab === "allocation" && (
            <>
              <section className="users-grid">
                <div className="form-card">
                  <div className="form-card-header">
                    <h3>Assign Hostel Room</h3>
                    <p>Select hostel, student, room and bed for allocation.</p>
                  </div>

                  <form onSubmit={handleAssignHostel}>
                    <div className="form-group">
                      <label>Hostel</label>
                      <select
                        value={selectedHostelId}
                        onChange={handleHostelSelect}
                        required
                      >
                        <option value="">Select hostel</option>

                        {hostels.map((hostel) => (
                          <option key={hostel._id} value={hostel._id}>
                            {hostel.name} - {hostel.type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedHostel && (
                      <div className="info-card">
                        <p>
                          <strong>Capacity:</strong>{" "}
                          {selectedHostel.capacity || 0}
                        </p>
                        <p>
                          <strong>Occupied:</strong> {selectedHostelOccupied}
                        </p>
                        <p>
                          <strong>Available:</strong> {selectedHostelAvailable}
                        </p>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Student</label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        required
                      >
                        <option value="">Select hostel student</option>

                        {unassignedStudents.map((student) => (
                          <option key={student._id} value={student._id}>
                            {student.studentName}{" "}
                            {student.rscNumber ? `(${student.rscNumber})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedStudent && (
                      <div className="info-card">
                        <p>
                          <strong>Student:</strong>{" "}
                          {selectedStudent.studentName}
                        </p>
                        <p>
                          <strong>RSC No:</strong>{" "}
                          {selectedStudent.rscNumber || "-"}
                        </p>
                        <p>
                          <strong>Type:</strong>{" "}
                          {selectedStudent.studentType || "-"}
                        </p>
                      </div>
                    )}

                    <div className="form-row">
                      <div className="form-group">
                        <label>Room Number</label>
                        <input
                          name="roomNumber"
                          value={allocationForm.roomNumber}
                          onChange={handleAllocationChange}
                          placeholder="Example: 101"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Bed Number</label>
                        <input
                          name="bedNumber"
                          value={allocationForm.bedNumber}
                          onChange={handleAllocationChange}
                          placeholder="Example: B1"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Joining Date</label>
                        <input
                          type="date"
                          name="joiningDate"
                          value={allocationForm.joiningDate}
                          onChange={handleAllocationChange}
                        />
                      </div>

                      <div className="form-group">
                        <label>Monthly Fee</label>
                        <input
                          type="number"
                          name="monthlyFee"
                          value={allocationForm.monthlyFee}
                          onChange={handleAllocationChange}
                          placeholder="₹"
                        />
                      </div>
                    </div>

                    <button
                      className="primary-btn"
                      disabled={savingAllocation || hostels.length === 0}
                    >
                      {savingAllocation ? "Assigning..." : "Assign Hostel Room"}
                    </button>
                  </form>
                </div>
              </section>

              <PendingStudentsTable students={unassignedStudents} />
            </>
          )}

          {activeTab === "students" && (
            <AllocationTable
              hostels={hostels}
              hostelStudents={hostelStudents}
              allocations={allocations}
              loading={loading}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              handleDeallocate={handleDeallocate}
              refresh={fetchHostelData}
            />
          )}
        </>
      )}
    </div>
  );
}

function SummaryRow({ title, description, value }) {
  return (
    <div className="action-item">
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function HostelTable({ hostels, formatCurrency }) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Hostel Records</h3>
          <p>Created hostel master records for this center.</p>
        </div>
      </div>

      {hostels.length === 0 ? (
        <div className="empty-state">
          <h4>No hostel created yet</h4>
          <p>Create a hostel using the form above.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Hostel</th>
                <th>Type</th>
                <th>Address</th>
                <th>Rooms</th>
                <th>Beds/Room</th>
                <th>Capacity</th>
                <th>Monthly Fee</th>
              </tr>
            </thead>

            <tbody>
              {hostels.map((hostel) => (
                <tr key={hostel._id}>
                  <td>{hostel.name}</td>
                  <td>{hostel.type}</td>
                  <td>{hostel.address || "-"}</td>
                  <td>{hostel.totalRooms || 0}</td>
                  <td>{hostel.bedsPerRoom || 0}</td>
                  <td>{hostel.capacity || 0}</td>
                  <td>{formatCurrency(hostel.monthlyFee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PendingStudentsTable({ students }) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Pending Hostel Allocation</h3>
          <p>Students who selected hostel facility but are not allocated yet.</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="empty-state">
          <h4>No pending hostel students</h4>
          <p>All eligible students are already allocated or no one requested hostel.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>RSC No</th>
                <th>Student Name</th>
                <th>Mobile</th>
                <th>Student Type</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.rscNumber || "-"}</td>
                  <td>{student.studentName}</td>
                  <td>{student.mobileNumber || "-"}</td>
                  <td>{student.studentType || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AllocationTable({
  hostels,
  hostelStudents,
  allocations,
  loading,
  formatDate,
  formatCurrency,
  handleDeallocate,
  refresh,
}) {
  return (
    <section className="table-card">
      <div className="table-header">
        <div>
          <h3>Hostel Allotment Records</h3>
          <p>Room and bed allocation records for hostel students.</p>
        </div>

        <button className="secondary-btn" onClick={refresh}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <h4>Loading hostel data...</h4>
          <p>Please wait while records are fetched.</p>
        </div>
      ) : hostels.length === 0 ? (
        <div className="empty-state">
          <h4>No hostel created yet</h4>
          <p>Create one hostel first, then assign students to rooms.</p>
        </div>
      ) : hostelStudents.length === 0 ? (
        <div className="empty-state">
          <h4>No hostel students found</h4>
          <p>Admit a student with hostel facility selected to show them here.</p>
        </div>
      ) : allocations.length === 0 ? (
        <div className="empty-state">
          <h4>No hostel room assigned yet</h4>
          <p>Use the allocation form to assign room and bed.</p>
        </div>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>RSC No</th>
                <th>Hostel</th>
                <th>Room</th>
                <th>Bed</th>
                <th>Joining Date</th>
                <th>Monthly Fee</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {allocations.map((record) => (
                <tr key={record._id}>
                  <td>{record.student?.studentName || "-"}</td>
                  <td>{record.student?.rscNumber || "-"}</td>
                  <td>{record.hostel?.name || "-"}</td>
                  <td>{record.roomNumber || "-"}</td>
                  <td>{record.bedNumber || "-"}</td>
                  <td>{formatDate(record.joiningDate)}</td>
                  <td>{formatCurrency(record.monthlyFee)}</td>
                  <td>
                    <span className="table-role-badge">{record.status}</span>
                  </td>
                  <td>
                    {record.status === "ACTIVE" ? (
                      <button
                        className="secondary-btn"
                        onClick={() => handleDeallocate(record)}
                      >
                        Mark Left
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Hostel;