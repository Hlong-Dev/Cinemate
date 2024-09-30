// src/components/Dashboard.js

import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome, {user?.username}!</p>
            <p>This page is only accessible to authenticated users.</p>
        </div>
    );
};

export default Dashboard;
