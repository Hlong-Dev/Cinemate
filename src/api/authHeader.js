// src/api/authHeader.js

export default function authHeader() {
    const token = localStorage.getItem('token');
    if (token) {
        return { Authorization: 'Bearer ' + token };
    } else {
        return {};
    }
}
