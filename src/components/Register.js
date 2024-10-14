import React, { useState } from 'react';
import axios from 'axios';
import '../Login.css'; // Import file CSS để định dạng giao diện

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const response = await axios.post('https://colkidclub-hutech.id.vn/api/register', {
                username,
                password,
                email,
                phone
            });

            // Hiển thị thông báo thành công
            setSuccessMessage('Registration successful! Please log in.');
            setError('');

            // Reset các trường nhập liệu
            setUsername('');
            setPassword('');
            setEmail('');
            setPhone('');
        } catch (error) {
            setError('Registration failed. Please try again.');
            setSuccessMessage('');
        }
    };

    const handleBack = () => {
        window.location.href = 'http://localhost:3000/'; // Quay lại trang chủ
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <img src="https://i.imgur.com/Rp89NPj.png" alt="Logo" className="login-logo" />
                <h2>Sign Up to watch with friends</h2>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
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
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            className="login-input"
                        />
                    </div>
                    <div>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Phone"
                            required
                            className="login-input"
                        />
                    </div>
                    <button type="submit" className="login-button">Register</button>
                </form>
                <button onClick={handleBack} className="back-button">Back</button>
                <p className="help-text">
                    Having trouble? <a href="/register">Get help</a> or <a href="/login">Sign-In</a>
                </p>
            </div>
        </div>
    );
};

export default Register;
