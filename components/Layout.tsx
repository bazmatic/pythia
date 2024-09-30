import React from 'react';
import Link from 'next/link';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header>
        <Link href="/" className="home-link">
          <span className="home-text">Home</span>
        </Link>
        <Link href="/stats" className="home-link">Stats</Link>
        <Link href="/history" className="home-link">History</Link>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;