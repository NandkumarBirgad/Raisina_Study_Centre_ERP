import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import API from "../../api/api";
import PageHeader from "../../components/PageHeader";

function SuperAdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [reportSearch, setReportSearch] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      const res = await API.get("/dashboard/super");
      setDashboard(res.data?.data || res.data || {});
    } catch (error) {
      console.error("Super admin dashboard failed:", error);
      setDashboard({});
    } finally {
      setLoading(false);
    }
  };

  const summary = dashboard || {};

  const centerRows = useMemo(() => {
    return Array.isArray(summary.centerWiseSummary)
      ? summary.centerWiseSummary
      : [];
  }, [summary]);

  const filteredCenterRows = useMemo(() => {
    const search = reportSearch.trim().toLowerCase();

    if (!search) return centerRows;

    return centerRows.filter((item) =>
      [item.centerName, item.centerCode, item.city, item.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [centerRows, reportSearch]);

  const maxStudents = Math.max(
    1,
    ...centerRows.map((item) => item.students || 0),
  );
  const maxCollection = Math.max(
    1,
    ...centerRows.map((item) => item.feeCollected || 0),
  );

  const handleDownloadExcelReport = () => {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        "Total Centers": summary.totalCenters || 0,
        "Active Centers": summary.activeCenters || 0,
        "Total Students": summary.totalStudents || 0,
        "Scholarship Students": summary.scholarshipStudents || 0,
        "Non-Scholarship Students": summary.nonScholarshipStudents || 0,
        "Exam Registrations": summary.examRegistrations || 0,
        "Merit Listed": summary.meritListed || 0,
        "Fee Collected": summary.totalFeeCollected || 0,
        "Pending Fees": summary.pendingFees || 0,
        "Donations Received": summary.donationsReceived || 0,
        Expenses: summary.totalExpenses || 0,
        "Net Balance": summary.netBalance || 0,
      },
    ]);

    const centerSheet = XLSX.utils.json_to_sheet(
      centerRows.map((item) => ({
        Center: item.centerName || "-",
        Code: item.centerCode || "-",
        City: item.city || "-",
        Students: item.students || 0,
        "Scholarship Students": item.scholarshipStudents || 0,
        "Non-Scholarship Students": item.nonScholarshipStudents || 0,
        Registrations: item.registrations || 0,
        "Merit Listed": item.meritListed || 0,
        Admitted: item.admitted || 0,
        "Admission Conversion %": item.admissionConversion || 0,
        "Fee Collected": item.feeCollected || 0,
        Donations: item.donationsReceived || 0,
        Expenses: item.expenses || 0,
        "Net Balance": item.netBalance || 0,
      })),
    );

    const academicSheet = XLSX.utils.json_to_sheet([
      {
        Metric: "Exam Registrations",
        Value: summary.examRegistrations || 0,
      },
      {
        Metric: "Merit Listed Students",
        Value: summary.meritListed || 0,
      },
      {
        Metric: "Scholarship Students",
        Value: summary.scholarshipStudents || 0,
      },
      {
        Metric: "Non-Scholarship Students",
        Value: summary.nonScholarshipStudents || 0,
      },
      {
        Metric: "Admitted Registrations",
        Value: summary.admittedRegistrations || 0,
      },
      {
        Metric: "Cancelled Registrations",
        Value: summary.cancelledRegistrations || 0,
      },
    ]);

    const financeSheet = XLSX.utils.json_to_sheet([
      {
        Metric: "Monthly Collection",
        Amount: summary.monthlyCollection || 0,
      },
      {
        Metric: "Total Fee Collected",
        Amount: summary.totalFeeCollected || 0,
      },
      {
        Metric: "Pending Fees",
        Amount: summary.pendingFees || 0,
      },
      {
        Metric: "Donations Received",
        Amount: summary.donationsReceived || 0,
      },
      {
        Metric: "Expenses",
        Amount: summary.totalExpenses || 0,
      },
      {
        Metric: "Net Balance",
        Amount: summary.netBalance || 0,
      },
    ]);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, centerSheet, "Center Wise Report");
    XLSX.utils.book_append_sheet(workbook, academicSheet, "Academic Snapshot");
    XLSX.utils.book_append_sheet(workbook, financeSheet, "Finance Report");

    XLSX.writeFile(workbook, "super-admin-dashboard-report.xlsx");
  };

  return (
    <div className="page">
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="System-wide overview of centers, students, admissions and financial performance."
      />

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>

        <button
          className={`tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          Reports
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          <section className="panel-card hero-panel">
            <div>
              <p className="eyebrow-text">System Control Center</p>
              <h2>Welcome back, Super Admin</h2>
              <p>
                Track centers, students, admissions, collections, donations,
                expenses and overall ERP performance from one dashboard.
              </p>
            </div>

            <button
              className="secondary-btn"
              onClick={fetchDashboardData}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </section>

          <section className="stats-grid">
            <SummaryCard
              label="Total Centers"
              value={summary.totalCenters || 0}
              helper={`${summary.activeCenters || 0} active centers`}
              loading={loading}
            />

            <SummaryCard
              label="Total Students"
              value={summary.totalStudents || 0}
              helper="Students admitted across centers"
              loading={loading}
            />

            <SummaryCard
              label="Total Fee Collected"
              value={formatCurrency(summary.totalFeeCollected)}
              helper="Student fee collection"
              loading={loading}
            />

            <SummaryCard
              label="Pending Fees"
              value={formatCurrency(summary.pendingFees)}
              helper={
                summary.pendingFeesAvailable === false
                  ? "Fee dues tracking not configured"
                  : "Outstanding student fees"
              }
              loading={loading}
            />
          </section>

          <section className="dashboard-split">
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h2>Academic / Admission Snapshot</h2>
                  <p>Current admission and scholarship status.</p>
                </div>
              </div>

              <div className="status-stack">
                <StatusLine
                  label="Exam Registrations"
                  value={summary.examRegistrations || 0}
                  className="warning"
                  loading={loading}
                />
                <StatusLine
                  label="Merit Listed Students"
                  value={summary.meritListed || 0}
                  className="info"
                  loading={loading}
                />
                <StatusLine
                  label="Scholarship Students"
                  value={summary.scholarshipStudents || 0}
                  className="success"
                  loading={loading}
                />
                <StatusLine
                  label="Non-Scholarship Students"
                  value={summary.nonScholarshipStudents || 0}
                  className="neutral"
                  loading={loading}
                />
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h2>Financial Snapshot</h2>
                  <p>Income, expenses and current balance.</p>
                </div>
              </div>

              <div className="status-stack">
                <StatusLine
                  label="Monthly Collection"
                  value={formatCurrency(summary.monthlyCollection)}
                  className="info"
                  loading={loading}
                />
                <StatusLine
                  label="Donations"
                  value={formatCurrency(summary.donationsReceived)}
                  className="success"
                  loading={loading}
                />
                <StatusLine
                  label="Expenses"
                  value={formatCurrency(summary.totalExpenses)}
                  className="danger"
                  loading={loading}
                />
                <StatusLine
                  label="Net Balance"
                  value={formatCurrency(summary.netBalance)}
                  className="success"
                  loading={loading}
                />
              </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-header">
              <div>
                <h2>Center Activity Preview</h2>
                <p>Students, admissions and collections across centers.</p>
              </div>
            </div>

            {centerRows.length === 0 ? (
              <EmptyState
                title="No center activity yet"
                message="Center-wise activity will appear after records are available."
              />
            ) : (
              <div className="activity-list">
                {centerRows.slice(0, 5).map((item) => (
                  <div className="activity-row" key={item.centerId}>
                    <div>
                      <h4>{item.centerName}</h4>
                      <p>
                        {item.students || 0} students ·{" "}
                        {item.registrations || 0} registrations ·{" "}
                        {formatCurrency(item.feeCollected)} collected
                      </p>
                    </div>

                    <span className="soft-badge">
                      Net {formatCurrency(item.netBalance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "reports" && (
        <>
          <section className="panel-card report-hero">
            <div>
              <p className="eyebrow-text">Reports & Analytics</p>
              <h2>Super Admin Report Center</h2>
              <p>
                Review center-wise students, collections, admission conversion
                and download the complete dashboard report in Excel format.
              </p>
            </div>

            <button className="primary-btn" onClick={handleDownloadExcelReport}>
              Download Excel Report
            </button>
          </section>

          <section className="dashboard-split">
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h2>Center-wise Students</h2>
                  <p>Centers ranked by admitted students.</p>
                </div>
              </div>

              <div className="bar-list">
                {centerRows.slice(0, 6).map((item) => (
                  <div className="bar-row" key={item.centerId}>
                    <div className="bar-info">
                      <span>{item.centerName}</span>
                      <strong>{item.students || 0}</strong>
                    </div>

                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${((item.students || 0) / maxStudents) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <h2>Center-wise Collection</h2>
                  <p>Student fee collection by center.</p>
                </div>
              </div>

              <div className="bar-list">
                {centerRows.slice(0, 6).map((item) => (
                  <div className="bar-row" key={item.centerId}>
                    <div className="bar-info">
                      <span>{item.centerName}</span>
                      <strong>{formatCurrency(item.feeCollected)}</strong>
                    </div>

                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${
                            ((item.feeCollected || 0) / maxCollection) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-header">
              <div>
                <h2>Center-wise Report</h2>
                <p>
                  Search and review students, admissions, collection and
                  financial summary by center.
                </p>
              </div>

              <input
                className="table-search"
                type="text"
                placeholder="Search center..."
                value={reportSearch}
                onChange={(event) => setReportSearch(event.target.value)}
              />
            </div>

            {filteredCenterRows.length === 0 ? (
              <EmptyState
                title="No matching center found"
                message="Try searching with another center name or code."
              />
            ) : (
              <div className="responsive-table">
                <table>
                  <thead>
                    <tr>
                      <th>Center</th>
                      <th>Students</th>
                      <th>Scholarship</th>
                      <th>Non-Scholarship</th>
                      <th>Registrations</th>
                      <th>Merit Listed</th>
                      <th>Admitted</th>
                      <th>Conversion</th>
                      <th>Fee Collected</th>
                      <th>Donations</th>
                      <th>Expenses</th>
                      <th>Net Balance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCenterRows.map((item) => (
                      <tr key={item.centerId}>
                        <td>
                          <div className="student-cell">
                            <strong>{item.centerName}</strong>
                            <span>{item.centerCode || "-"}</span>
                          </div>
                        </td>
                        <td>{item.students || 0}</td>
                        <td>{item.scholarshipStudents || 0}</td>
                        <td>{item.nonScholarshipStudents || 0}</td>
                        <td>{item.registrations || 0}</td>
                        <td>{item.meritListed || 0}</td>
                        <td>{item.admitted || 0}</td>
                        <td>{item.admissionConversion || 0}%</td>
                        <td>{formatCurrency(item.feeCollected)}</td>
                        <td>{formatCurrency(item.donationsReceived)}</td>
                        <td>{formatCurrency(item.expenses)}</td>
                        <td>{formatCurrency(item.netBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
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

function StatusLine({ label, value, className, loading }) {
  return (
    <div className="status-line">
      <div>
        <span className={`status-badge ${className}`}>{label}</span>
      </div>
      <strong>{loading ? "..." : value}</strong>
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

function formatCurrency(value) {
  const amount = Number(value || 0);

  return `₹ ${amount.toLocaleString("en-IN")}`;
}

export default SuperAdminDashboard;
