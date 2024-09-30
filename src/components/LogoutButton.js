// src/components/LogoutButton.js

import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const LogoutButton = () => {
    const { logout } = useContext(AuthContext);

    const handleLogout = () => {
        logout();
        window.location.href = '/login'; // Redirect to login page
    };

    return <button onClick={handleLogout}>Logout</button>;
};

export default LogoutButton;
