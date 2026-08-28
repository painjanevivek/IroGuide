import "@/app/route-styles.css";

export default function DashboardLoading() {
  return <main className="dashboard-main dashboard-route-loading" aria-busy="true" aria-label="Loading your workspace"><div className="guide-skeleton guide-skeleton-short" /><div className="guide-skeleton guide-skeleton-heading" /><section className="dashboard-guide is-loading"><div className="guide-copy"><span className="guide-skeleton guide-skeleton-short" /><span className="guide-skeleton guide-skeleton-title" /><span className="guide-skeleton" /></div><div className="guide-checklist">{[1, 2, 3, 4].map((item) => <span className="guide-skeleton" key={item} />)}</div></section></main>;
}
