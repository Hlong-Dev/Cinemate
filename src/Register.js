import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
    const [credentials, setCredentials] = useState({
        username: '',
        password: '',
        email: '',
        phone: '',
        address: ''
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        fetch('http://localhost:8080/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(credentials)
        })
            .then(response => {
                if (response.ok) {
                    alert('Đăng ký thành công');
                    navigate('/login');
                } else {
                    alert('Đăng ký thất bại');
                }
            })
            .catch(error => {
                console.error('Đã xảy ra lỗi:', error);
            });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input name="username" placeholder="Username" onChange={handleChange} required />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
            <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
            <input name="phone" placeholder="Phone" onChange={handleChange} required />
            <input name="address" placeholder="Address" onChange={handleChange} required />
            <button type="submit">Đăng ký</button>
        </form>
    );
}

export default Register;
