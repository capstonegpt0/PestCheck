import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageContent - wraps page content (below navigation) with entrance animation.
 * The navigation bar is rendered OUTSIDE this wrapper so it stays static.
 * 
 * Usage in any page:
 *   <div className="min-h-screen bg-gray-50">
 *     <Navigation user={user} onLogout={onLogout} />
 *     <PageContent>
 *       <div className="max-w-7xl mx-auto px-4 py-8">
 *         ... page content ...
 *       </div>
 *     </PageContent>
 *   </div>
 */
const PageContent = ({ children, className = '' }) => {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className={`page-content-enter ${className}`}
    >
      {children}
    </div>
  );
};

export default PageContent;