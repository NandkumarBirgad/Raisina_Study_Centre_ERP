function StatCard({ title, value, description, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-icon">{icon}</span>
      </div>

      <h3>{value}</h3>
      <p className="stat-title">{title}</p>

      {description && <p className="stat-description">{description}</p>}
    </div>
  );
}

export default StatCard;