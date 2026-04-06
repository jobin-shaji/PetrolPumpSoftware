import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="page-state">
    <h1>Page not found</h1>
    <p>The page you requested does not exist.</p>
    <Link to="/login" className="primary-button inline-link">
      Back to login
    </Link>
  </div>
);

export default NotFoundPage;
