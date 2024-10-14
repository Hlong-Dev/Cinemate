// src/App.js

import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './components/Home';
import ChatRoom from './ChatRoom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PrivateRoute from './components/PrivateRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Bảo vệ Dashboard bằng PrivateRoute */}
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

                    {/* Bảo vệ ChatRoom bằng PrivateRoute */}
                    <Route path="/room/:roomId" element={<PrivateRoute><ChatRoom /></PrivateRoute>} />

                    {/* Redirect các route không tồn tại về Home */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
