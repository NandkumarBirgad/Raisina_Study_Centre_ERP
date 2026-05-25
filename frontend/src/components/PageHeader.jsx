function PageHeader({ title, subtitle, breadcrumb = [] }) {
  return (
    <div className="page-header">
      <div>
        <div className="breadcrumb">
          <span>Dashboard</span>
          {breadcrumb.map((item, index) => (
            <span key={index}>/ {item}</span>
          ))}
        </div>

        <h1>{title}</h1>

        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}

export default PageHeader;