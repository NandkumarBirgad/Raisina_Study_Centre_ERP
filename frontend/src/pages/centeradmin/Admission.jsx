import { useEffect, useMemo, useState } from "react";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";

function getCenterId(user) {
  return user?.center?._id || user?.centerId || user?.center || "";
}

function getCenterName(user) {
  return user?.center?.centerName || user?.centerName || "";
}

function formatDateForInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().split("T")[0];
}

function createInitialFormData(user) {
  return {
    center: getCenterName(user),
    studentName: "",
    mobileNo: "",
    parentMobileNo: "",
    dateOfBirth: "",
    aadharCardNo: "",
    education: "",
    percentage: "",
    homeAddress: "",
    localAddress: "",
    hobbies: "",
    qualifyExam1: "",
    qualifyExam2: "",
    qualifyExam3: "",
    qualifyExam4: "",
    targetedPost: "",
    aimOfLife: "",
    studentType: "NON_SCHOLARSHIP",
    messFacility: false,
    hostelFacility: false,
    libraryFacility: false,
    admissionDate: new Date().toISOString().split("T")[0],
  };
}

function getCenterObjectId(center) {
  if (!center) return "";
  if (typeof center === "string") return center;
  return center?._id || center?.id || "";
}

function getEntryRegistration(entry) {
  return entry?.registrationId || {};
}

function getPreferredExamCenter(entry, selectedList) {
  const registration = getEntryRegistration(entry);

  return (
    registration?.preferredExamCenter ||
    registration?.preferredCenter ||
    selectedList?.center ||
    null
  );
}

function getPreferredAdmissionCenter(entry, selectedList) {
  const registration = getEntryRegistration(entry);

  return (
    registration?.preferredAdmissionCenter ||
    registration?.preferredCenter ||
    selectedList?.center ||
    null
  );
}

function getCenterDisplayName(center, fallback = "Not available") {
  if (!center) return fallback;

  if (typeof center === "string") return fallback;

  const name = center?.centerName || center?.name || fallback;
  const code = center?.centerCode || center?.code || "";

  return `${name}${code ? ` (${code})` : ""}`;
}

function getEntryStudentName(entry) {
  const registration = entry?.registrationId || {};

  return (
    registration?.fullName ||
    entry?.name ||
    entry?.studentName ||
    "Unnamed Candidate"
  );
}

function getEntryMobileNumber(entry) {
  const registration = entry?.registrationId || {};

  return registration?.mobileNumber || entry?.mobileNumber || "-";
}

function Admissions() {
  const { user } = useAuth();

  const [formData, setFormData] = useState(() => createInitialFormData(user));

  const [meritLists, setMeritLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedList, setSelectedList] = useState(null);
  const [selectedRank, setSelectedRank] = useState("");

  const [loading, setLoading] = useState(false);
  const [meritLoading, setMeritLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rscPreview, setRscPreview] = useState("");

  const isCenterAdmin = user?.role === "CENTER_ADMIN";
  const centerId = getCenterId(user);

  const isScholarshipAdmission = formData.studentType === "SCHOLARSHIP";

  const selectedEntry = selectedList?.entries?.find(
    (entry) => Number(entry.rank) === Number(selectedRank),
  );

  const availableMeritEntries = useMemo(() => {
    const entries = selectedList?.entries || [];

    return entries.filter((entry) => {
      const notAdmitted = entry.admissionStatus !== "ADMITTED";

      if (!notAdmitted) return false;

      if (
        selectedList?.scholarshipCutoffRank &&
        Number(entry.rank) > Number(selectedList.scholarshipCutoffRank)
      ) {
        return false;
      }

      const preferredAdmissionCenter = getPreferredAdmissionCenter(
        entry,
        selectedList,
      );

      const preferredAdmissionCenterId = getCenterObjectId(
        preferredAdmissionCenter,
      );

      // Old entries may not have preferredAdmissionCenter.
      // In that case we allow them for backward compatibility.
      if (!preferredAdmissionCenterId) return true;

      return preferredAdmissionCenterId === centerId;
    });
  }, [selectedList, centerId]);

  const predictedStudentType =
    selectedEntry && selectedList?.scholarshipCutoffRank
      ? Number(selectedEntry.rank) <= Number(selectedList.scholarshipCutoffRank)
        ? "SCHOLARSHIP"
        : "NON_SCHOLARSHIP"
      : "";

  const selectedExamCenter = selectedEntry
    ? getPreferredExamCenter(selectedEntry, selectedList)
    : null;

  const selectedAdmissionCenter = selectedEntry
    ? getPreferredAdmissionCenter(selectedEntry, selectedList)
    : null;

  const selectedAdmissionCenterId = getCenterObjectId(selectedAdmissionCenter);

  const admissionCenterMismatch =
    selectedEntry &&
    selectedAdmissionCenterId &&
    selectedAdmissionCenterId !== centerId;

  useEffect(() => {
    if (!user) return;

    setFormData((prev) => ({
      ...prev,
      center: getCenterName(user),
    }));

    fetchNextRSC();
    fetchMeritLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!isScholarshipAdmission || !selectedEntry) return;

    const registration = selectedEntry.registrationId || {};

    setFormData((prev) => ({
      ...prev,
      studentName:
        registration.fullName || selectedEntry.name || prev.studentName,
      mobileNo:
        registration.mobileNumber ||
        selectedEntry.mobileNumber ||
        prev.mobileNo,
      dateOfBirth: formatDateForInput(registration.dob) || prev.dateOfBirth,
      homeAddress: registration.addressLine || prev.homeAddress,
    }));
  }, [selectedEntry, isScholarshipAdmission]);

  const fetchNextRSC = async () => {
    try {
      if (!centerId) {
        setRscPreview("");
        return;
      }

      const res = await API.get(`/admission/next-rsc?centerId=${centerId}`);

      const nextRSC = res?.data?.data?.rscNumber || res?.data?.rscNumber || "";

      setRscPreview(nextRSC);
    } catch (err) {
      console.error("Failed to fetch next RSC:", err);
      setRscPreview("");
    }
  };

  const fetchMeritLists = async () => {
    setMeritLoading(true);

    try {
      const res = await API.get("/admission/merit-list");
      const data = res.data?.data || res.data || [];

      setMeritLists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Unable to fetch merit lists:", err);
      setMeritLists([]);
    } finally {
      setMeritLoading(false);
    }
  };

  const fetchMeritListById = async (id) => {
    if (!id) {
      setSelectedList(null);
      return;
    }

    setError("");
    setMessage("");
    setSelectedRank("");
    setSelectedList(null);

    try {
      const res = await API.get(`/admission/merit-list/${id}`);
      setSelectedList(res.data?.data || res.data);
    } catch (err) {
      console.error("Unable to fetch merit list details:", err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to fetch merit list details.",
      );
    }
  };

  if (!isCenterAdmin) {
    return (
      <div className="access-denied-card">
        <h2>Admissions Module Locked</h2>
        <p>Login with a CENTER_ADMIN account to create admission records.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "studentType") {
      setSelectedListId("");
      setSelectedList(null);
      setSelectedRank("");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setMessage("");
    setError("");
  };

  const handleMeritListChange = async (e) => {
    const id = e.target.value;

    setSelectedListId(id);
    await fetchMeritListById(id);
  };

  const resetForm = () => {
    setFormData(createInitialFormData(user));
    setSelectedListId("");
    setSelectedList(null);
    setSelectedRank("");
    setError("");
  };

  const buildCommonPayload = () => {
    const addresses = [];

    if (formData.homeAddress.trim()) {
      addresses.push({
        addressType: "HOME",
        addressLine: formData.homeAddress.trim(),
      });
    }

    if (formData.localAddress.trim()) {
      addresses.push({
        addressType: "LOCAL",
        addressLine: formData.localAddress.trim(),
      });
    }

    return {
      studentName: formData.studentName.trim(),
      mobileNumber: formData.mobileNo.trim(),
      parentMobileNumber: formData.parentMobileNo.trim(),
      dob: formData.dateOfBirth || undefined,
      aadharNumber: formData.aadharCardNo.trim(),

      education: formData.education.trim(),
      percentage: formData.percentage ? Number(formData.percentage) : undefined,

      addresses,
      hobbies: formData.hobbies.trim(),

      qualifyExams: [
        formData.qualifyExam1,
        formData.qualifyExam2,
        formData.qualifyExam3,
        formData.qualifyExam4,
      ].filter((exam) => exam.trim() !== ""),

      targetedPost: formData.targetedPost.trim(),
      aimOfLife: formData.aimOfLife.trim(),

      admissionDate: formData.admissionDate,

      facilities: {
        mess: formData.messFacility,
        hostel: formData.hostelFacility,
        library: formData.libraryFacility,
      },
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!centerId) {
        throw new Error(
          "Your center admin account is not assigned to a center.",
        );
      }

      if (!formData.studentName.trim()) {
        throw new Error("Student name is required.");
      }

      if (!formData.mobileNo.trim()) {
        throw new Error("Mobile number is required.");
      }

      const commonPayload = buildCommonPayload();

      let payload = {};

      if (isScholarshipAdmission) {
        if (!selectedList) {
          throw new Error("Please select a merit list.");
        }

        if (!selectedRank) {
          throw new Error("Please select a merit rank candidate.");
        }

        if (!selectedList.scholarshipCutoffRank) {
          throw new Error(
            "Scholarship cutoff rank is not set for this merit list.",
          );
        }

        if (admissionCenterMismatch) {
          throw new Error(
            "This candidate selected another center for admission. Please admit only candidates assigned to your center.",
          );
        }

        if (Number(selectedRank) > Number(selectedList.scholarshipCutoffRank)) {
          throw new Error(
            "Selected candidate is outside the scholarship cutoff rank.",
          );
        }

        payload = {
          ...commonPayload,
          meritListId: selectedList._id,
          entryRank: Number(selectedRank),
          preferredExamCenter: getCenterObjectId(selectedExamCenter),
          preferredAdmissionCenter: getCenterObjectId(selectedAdmissionCenter),
          centerId,
        };
      } else {
        payload = {
          ...commonPayload,
          centerId,
          centerName: formData.center,
          overrideStudentType: "NON_SCHOLARSHIP",
        };
      }

      const res = await API.post("/admission/admit", payload);

      const student = res?.data?.data?.student || res?.data?.student;

      const rscNumber =
        res?.data?.data?.rscNumber ||
        student?.rscNumber ||
        res?.data?.rscNumber;

      const prn = res?.data?.data?.prn || student?.prn || res?.data?.prn;

      setMessage(
        rscNumber
          ? `Admission submitted successfully. RSC No: ${rscNumber}${
              prn ? `, PRN: ${prn}` : ""
            }`
          : "Admission submitted successfully.",
      );

      resetForm();
      await fetchNextRSC();
      await fetchMeritLists();

      if (selectedList?._id) {
        await fetchMeritListById(selectedList._id);
      }
    } catch (err) {
      console.error("Admission submit failed:", err);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to submit admission form.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admissions-page">
      <div className="admission-paper">
        <div className="admission-header">
          <h1>Admission Form</h1>
          <p className="muted">
            Select admission type. Scholarship students are admitted from the
            uploaded merit list, while non-scholarship students are admitted
            directly.
          </p>
        </div>

        {message && <div className="success-box">{message}</div>}
        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <section className="form-section">
            <h2>Admission Details</h2>

            <div className="clean-form-grid">
              <div className="form-field">
                <label>RSC No</label>
                <input
                  type="text"
                  value={rscPreview || "Generating..."}
                  readOnly
                />
              </div>

              <div className="form-field">
                <label>Center</label>
                <input
                  type="text"
                  value={formData.center || "Assigned Center"}
                  readOnly
                />
              </div>

              <div className="form-field">
                <label>Student Type</label>
                <select
                  name="studentType"
                  value={formData.studentType}
                  onChange={handleChange}
                  required
                >
                  <option value="NON_SCHOLARSHIP">
                    Non-Scholarship / Direct Admission
                  </option>
                  <option value="SCHOLARSHIP">
                    Scholarship / From Merit List
                  </option>
                </select>
              </div>

              <div className="form-field">
                <label>Admission Date</label>
                <input
                  type="date"
                  name="admissionDate"
                  value={formData.admissionDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </section>

          {isScholarshipAdmission && (
            <section className="form-section">
              <h2>Merit List Selection</h2>

              <div className="clean-form-grid">
                <div className="form-field">
                  <label>Merit List</label>
                  <select
                    value={selectedListId}
                    onChange={handleMeritListChange}
                    required
                  >
                    <option value="">
                      {meritLoading
                        ? "Loading merit lists..."
                        : "Select merit list"}
                    </option>

                    {meritLists.map((list) => (
                      <option key={list._id} value={list._id}>
                        {list.center?.centerName || "Center"} - {list.year}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedList && (
                  <div className="form-field">
                    <label>Candidate Rank</label>
                    <select
                      value={selectedRank}
                      onChange={(e) => setSelectedRank(e.target.value)}
                      required
                    >
                      <option value="">Select candidate</option>

                      {availableMeritEntries.map((entry) => (
                        <option key={entry.rank} value={entry.rank}>
                          Rank {entry.rank} - {getEntryStudentName(entry)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedList && (
                  <div className="form-field">
                    <label>Scholarship Cutoff</label>
                    <input
                      type="text"
                      value={
                        selectedList.scholarshipCutoffRank
                          ? `Rank ${selectedList.scholarshipCutoffRank}`
                          : "Not set"
                      }
                      readOnly
                    />
                  </div>
                )}

                {selectedEntry && (
                  <div className="form-field">
                    <label>Predicted Type</label>
                    <input
                      type="text"
                      value={predictedStudentType || "Not available"}
                      readOnly
                    />
                  </div>
                )}
              </div>

              {selectedEntry && (
                <>
                  <div className="candidate-card">
                    <div>
                      <p className="muted">Selected Candidate</p>
                      <h3>{getEntryStudentName(selectedEntry)}</h3>
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
                        <strong>{getEntryMobileNumber(selectedEntry)}</strong>
                      </p>

                      <p>
                        <span>Registration</span>
                        <strong>
                          {selectedEntry.registrationId?.registrationNumber ||
                            selectedEntry.registrationNumber ||
                            "Not linked"}
                        </strong>
                      </p>

                      <p>
                        <span>Exam Center</span>
                        <strong>
                          {getCenterDisplayName(selectedExamCenter)}
                        </strong>
                      </p>

                      <p>
                        <span>Admission Center</span>
                        <strong>
                          {getCenterDisplayName(selectedAdmissionCenter)}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {admissionCenterMismatch && (
                    <div className="alert warning">
                      This candidate selected another center for admission.
                      Current center admin cannot admit this student.
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          <section className="form-section">
            <h2>Student Details</h2>

            <div className="clean-form-grid">
              <div className="form-field full-width">
                <label>Student Name</label>
                <input
                  type="text"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="form-field">
                <label>Mobile No</label>
                <input
                  type="text"
                  name="mobileNo"
                  value={formData.mobileNo}
                  onChange={handleChange}
                  placeholder="Student mobile number"
                  required
                />
              </div>

              <div className="form-field">
                <label>Parent Mobile No</label>
                <input
                  type="text"
                  name="parentMobileNo"
                  value={formData.parentMobileNo}
                  onChange={handleChange}
                  placeholder="Parent mobile number"
                />
              </div>

              <div className="form-field">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label>Aadhar Card No</label>
                <input
                  type="text"
                  name="aadharCardNo"
                  value={formData.aadharCardNo}
                  onChange={handleChange}
                  placeholder="Enter Aadhar number"
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>Education Details</h2>

            <div className="clean-form-grid">
              <div className="form-field">
                <label>Education</label>
                <input
                  type="text"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  placeholder="Example: 12th, Graduate"
                />
              </div>

              <div className="form-field">
                <label>Percentage</label>
                <input
                  type="number"
                  name="percentage"
                  value={formData.percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  placeholder="Example: 75"
                />
              </div>

              <div className="form-field full-width">
                <label>Qualify Exam Name</label>

                <div className="exam-grid">
                  <input
                    type="text"
                    name="qualifyExam1"
                    placeholder="1."
                    value={formData.qualifyExam1}
                    onChange={handleChange}
                  />

                  <input
                    type="text"
                    name="qualifyExam2"
                    placeholder="2."
                    value={formData.qualifyExam2}
                    onChange={handleChange}
                  />

                  <input
                    type="text"
                    name="qualifyExam3"
                    placeholder="3."
                    value={formData.qualifyExam3}
                    onChange={handleChange}
                  />

                  <input
                    type="text"
                    name="qualifyExam4"
                    placeholder="4."
                    value={formData.qualifyExam4}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>Address Details</h2>

            <div className="clean-form-grid">
              <div className="form-field full-width">
                <label>Home Address</label>
                <textarea
                  name="homeAddress"
                  value={formData.homeAddress}
                  onChange={handleChange}
                  placeholder="Enter permanent home address"
                  rows={3}
                />
              </div>

              <div className="form-field full-width">
                <label>Local Address</label>
                <textarea
                  name="localAddress"
                  value={formData.localAddress}
                  onChange={handleChange}
                  placeholder="Enter local address"
                  rows={3}
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>Other Details</h2>

            <div className="clean-form-grid">
              <div className="form-field full-width">
                <label>Hobbies</label>
                <input
                  type="text"
                  name="hobbies"
                  value={formData.hobbies}
                  onChange={handleChange}
                  placeholder="Enter hobbies"
                />
              </div>

              <div className="form-field">
                <label>Targeted Post</label>
                <input
                  type="text"
                  name="targetedPost"
                  value={formData.targetedPost}
                  onChange={handleChange}
                  placeholder="Example: Police, Army, MPSC"
                />
              </div>

              <div className="form-field">
                <label>Aim of Life</label>
                <input
                  type="text"
                  name="aimOfLife"
                  value={formData.aimOfLife}
                  onChange={handleChange}
                  placeholder="Enter aim"
                />
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>Facilities Required</h2>

            <div className="facility-options clean-facilities">
              <label>
                <input
                  type="checkbox"
                  name="messFacility"
                  checked={formData.messFacility}
                  onChange={handleChange}
                />
                Mess Facility
              </label>

              <label>
                <input
                  type="checkbox"
                  name="hostelFacility"
                  checked={formData.hostelFacility}
                  onChange={handleChange}
                />
                Hostel Facility
              </label>

              <label>
                <input
                  type="checkbox"
                  name="libraryFacility"
                  checked={formData.libraryFacility}
                  onChange={handleChange}
                />
                Library Facility
              </label>
            </div>
          </section>

          <div className="admission-actions">
            <button type="button" className="secondary-btn" onClick={resetForm}>
              Clear Form
            </button>

            <button
              type="submit"
              className="primary-btn admission-submit"
              disabled={loading || admissionCenterMismatch}
            >
              {loading
                ? "Submitting..."
                : isScholarshipAdmission
                  ? "Admit Scholarship Student"
                  : "Submit Direct Admission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Admissions;
