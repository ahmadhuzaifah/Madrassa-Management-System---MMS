import { Link } from 'react-router-dom';

export function ExamsPage() {
  return (
    <section className="panel">
      <h3>Exams</h3>
      <div className="button-row">
        <Link className="ghost-button" to="/exams/create">Create exam</Link>
        <Link className="ghost-button" to="/exams/marks-entry">Marks entry</Link>
        <Link className="ghost-button" to="/exams/results">Results</Link>
        <Link className="ghost-button" to="/exams/result-card">Result card</Link>
      </div>
      <div className="card-grid">
        <div className="mini-card"><strong>Exams</strong><span>Manage schedules and subjects</span></div>
        <div className="mini-card"><strong>Results</strong><span>Calculate grades and rankings</span></div>
      </div>
    </section>
  );
}
