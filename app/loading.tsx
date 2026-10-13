export default function Loading() {
  return (
    <div role="status" aria-label="در حال باز کردن صفحه">
      <div className="skeleton" style={{ width: 220, height: 36, marginBottom: 25 }} />
      <div className="skeleton" style={{ height: 340, marginBottom: 20 }} />
      <div className="dashboard-stats">
        {[1, 2, 3, 4].map((n) => (
          <div className="skeleton" key={n} style={{ height: 100 }} />
        ))}
      </div>
    </div>
  );
}
