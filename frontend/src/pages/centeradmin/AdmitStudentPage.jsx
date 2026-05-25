import { useEffect, useState } from "react";
import API from "../../api/api";

function AdmitStudentPage() {
  const [meritLists, setMeritLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [selectedRank, setSelectedRank] = useState("");

  const [extra, setExtra] = useState({
    dob: "",
    aadharNumber: "",
    addressLine: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [admittedStudent, setAdmittedStudent] = useState(null);

  useEffect(() => {
    fetchMeritLists();
  }, []);

  const fetchMeritLists = async () => {
    try {
      const res = await API.get("/admission/merit-list");
      setMeritLists(res.data.data || []);
    } catch {
      setError("Unable to fetch merit lists. Please check login.");
    }
  };

  const handleSelectList = async (id) => {
    setError("");
    setMessage("");
    setSelectedRank("");
    setSelectedList(null);

    try {
      const res = await API.get(`/admission/merit-list/${id}`);
      setSelectedList(res.data.data);
    } catch {
      setError("Unable to fetch merit list details");
    }
  };

  const selectedEntry = selectedList?.entries?.find(
    (entry) => Number(entry.rank) === Number(selectedRank),
  );

  const predictedStudentType =
    selectedEntry && selectedList?.scholarshipCutoffRank
      ? selectedEntry.rank <= selectedList.scholarshipCutoffRank
        ? "SCHOLARSHIP"
        : "NON_SCHOLARSHIP"
      : "";

  const handleAdmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setAdmittedStudent(null);

    if (!selectedList || !selectedRank) {
      setError("Please select merit list and rank");
      return;
    }

    try {
      const registration = selectedEntry?.registrationId || {};

      const preferredExamCenter =
        registration?.preferredExamCenter ||
        registration?.preferredCenter ||
        selectedList?.center;

      const preferredAdmissionCenter =
        registration?.preferredAdmissionCenter ||
        registration?.preferredCenter ||
        selectedList?.center;

      const payload = {
        meritListId: selectedList._id,
        entryRank: Number(selectedRank),

        preferredExamCenter:
          typeof preferredExamCenter === "string"
            ? preferredExamCenter
            : preferredExamCenter?._id,

        preferredAdmissionCenter:
          typeof preferredAdmissionCenter === "string"
            ? preferredAdmissionCenter
            : preferredAdmissionCenter?._id,

        dob: extra.dob || registration?.dob || undefined,
        aadharNumber: extra.aadharNumber,
        addresses: [
          {
            addressType: "HOME",
            addressLine:
              extra.addressLine ||
              registration?.addressLine ||
              "Address not provided",
          },
        ],
      };

      const res = await API.post("/admission/admit", payload);

      setMessage(res.data.message);
      setAdmittedStudent(res.data.data.student);

      await handleSelectList(selectedList._id);
    } catch (err) {
      setError(err.response?.data?.message || "Admission failed");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admission Module</p>
          <h1>Admit Student from Merit List</h1>
          <p>
            Select a merit-list candidate and admit them as scholarship or
            non-scholarship based on cutoff rank.
          </p>
        </div>
      </div>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="two-column">
        <div className="panel">
          <h2>Select Candidate</h2>

          <form onSubmit={handleAdmit} className="form-stack">
            <div className="form-group">
              <label>Merit List</label>
              <select
                onChange={(e) => handleSelectList(e.target.value)}
                required
              >
                <option value="">Select merit list</option>
                {meritLists.map((list) => (
                  <option key={list._id} value={list._id}>
                    {list.center?.centerName || "Center"} - {list.year}
                  </option>
                ))}
              </select>
            </div>

            {selectedList && (
              <div className="form-group">
                <label>Candidate Rank</label>
                <select
                  value={selectedRank}
                  onChange={(e) => setSelectedRank(e.target.value)}
                  required
                >
                  <option value="">Select rank</option>
                  {selectedList.entries
                    .filter((entry) => entry.admissionStatus !== "ADMITTED")
                    .map((entry) => (
                      <option key={entry.rank} value={entry.rank}>
                        Rank {entry.rank} - {entry.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {selectedEntry && (
              <div className="candidate-card">
                <div>
                  <p className="muted">Candidate</p>
                  <h3>{selectedEntry.name}</h3>
                </div>

                <div className="candidate-grid">
                  <p>
                    <span>Rank</span>
                    <strong>{selectedEntry.rank}</strong>
                  </p>
                  <p>
                    <span>Score</span>
                    <strong>{selectedEntry.score}</strong>
                  </p>
                  <p>
                    <span>Mobile</span>
                    <strong>{selectedEntry.mobileNumber || "-"}</strong>
                  </p>
                  <p>
                    <span>Student Type</span>
                    <strong>{predictedStudentType}</strong>
                  </p>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={extra.dob}
                onChange={(e) => setExtra({ ...extra, dob: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Aadhar Number</label>
              <input
                value={extra.aadharNumber}
                onChange={(e) =>
                  setExtra({ ...extra, aadharNumber: e.target.value })
                }
                placeholder="Enter Aadhar number"
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                value={extra.addressLine}
                onChange={(e) =>
                  setExtra({ ...extra, addressLine: e.target.value })
                }
                placeholder="Enter address if not already present"
              />
            </div>

            <button className="primary-btn">Admit Student</button>
          </form>
        </div>

        <div className="panel">
          <h2>Admission Result</h2>

          {!admittedStudent && (
            <p className="muted">
              After admission, the created student details will appear here.
            </p>
          )}

          {admittedStudent && (
            <div className="result-card">
              <h3>{admittedStudent.studentName}</h3>

              <div className="info-list">
                <p>
                  <span>Student Type</span>
                  <strong>{admittedStudent.studentType}</strong>
                </p>
                <p>
                  <span>RSC Number</span>
                  <strong>{admittedStudent.rscNumber}</strong>
                </p>
                <p>
                  <span>PRN</span>
                  <strong>{admittedStudent.prn}</strong>
                </p>
                <p>
                  <span>Merit Rank</span>
                  <strong>{admittedStudent.meritRank || "-"}</strong>
                </p>
                <p>
                  <span>Library Access</span>
                  <strong>
                    {admittedStudent.libraryAccess ? "Yes" : "No"}
                  </strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdmitStudentPage;
