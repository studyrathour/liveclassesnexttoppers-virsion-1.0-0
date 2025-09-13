import React from 'react';
import { GraduationCap } from 'lucide-react';
import Notifications from './Notifications';

const Header = () => {
  return (
    <header className="student-header">
      <div className="logo-title">
        <GraduationCap className="logo-icon" size={32} />
        <h1 className="app-title">EduMaster</h1>
      </div>
      <Notifications />
    </header>
  );
};

export default Header;
