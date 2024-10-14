
import React, { useState } from 'react';
import axios from 'axios';
import '../Login.css'; // Import file CSS để định dạng giao diện

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const response = await axios.post('https://colkidclub-hutech.id.vn/api/auth/login', {
                username,
                password
            });
            const { token } = response.data;
            localStorage.setItem('token', token);

            // Redirect to home page or dashboard
            window.location.href = '/';
        } catch (error) {
            setError('Invalid username or password');
        }
    };

    const handleBack = () => {
        window.location.href = 'http://localhost:3000/';
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <img src="https://i.imgur.com/Rp89NPj.png" alt="Logo" className="login-logo" /> {/* Thay logo-url bằng đường dẫn của logo */}
                <h2>Sign-In to watch with friends</h2>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <form onSubmit={handleSubmit} className="login-form">
                    <div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            required
                            className="login-input"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            className="login-input"
                        />
                    </div>
                    <button type="submit" className="login-button">Login</button>
                </form>
                <button onClick={handleBack} className="back-button">Back</button>
                <p className="help-text">
                    Having trouble? <a href="/register">Get help</a> or <a href="/register">Sign up</a>
                </p>

            </div>
        </div>
    );
};

export default Login;
