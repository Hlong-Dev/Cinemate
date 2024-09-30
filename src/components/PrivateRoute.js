// src/components/PrivateRoute.js

import React from 'react';
import { Navigate } from 'react-router-dom';

// Giả sử bạn lưu token trong localStorage sau khi người dùng đăng nhập
const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
};

const PrivateRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
