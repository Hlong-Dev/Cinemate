import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import LogoutButton from './LogoutButton';
import RoomList from '../RoomList';
import { Link, useNavigate } from 'react-router-dom';
import '../Home.css';

const Home = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user } = useContext(AuthContext);
    const sidebarRef = useRef(null);
    const [rooms, setRooms] = useState([]); // Lưu danh sách phòng
    const navigate = useNavigate();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [sidebarRef]);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const response = await fetch("https://ddf1-183-91-29-130.ngrok-free.app/api/rooms");

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const roomsData = await response.json();
            setRooms(Array.isArray(roomsData) ? roomsData : []); // Đảm bảo rooms là mảng
        } catch (error) {
            console.error("Error fetching rooms:", error);
            setRooms([]); // Đặt rooms là mảng rỗng khi gặp lỗi
        }
    };

    return (
        <>
            <header className="header">
                <div className="top-bar">
                    <div className="menu-icon" onClick={toggleSidebar}>
                        <span>&#9776;</span>
                    </div>
                    <div className="logo">
                        <img src="https://i.imgur.com/Rp89NPj.png" alt="YouTube" />
                    </div>
                </div>
                <div className="divider"></div>
                <div className="search-bar">
                    <i className="fas fa-search search-icon"></i>
                    <input type="text" placeholder="search video, series, or film..." />
                </div>
            </header>
            <nav ref={sidebarRef} className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <ul>
                    <li>
                        <a href="#" onClick={(e) => { e.preventDefault(); createRoom(); }}>Create Room</a>
                    </li>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/dashboard">Dashboard</Link></li>
                    <AuthContext.Consumer>
                        {({ user }) =>
                            user ? (
                                <li><LogoutButton /></li>
                            ) : (
                                <li><Link to="/login">Login</Link></li>
                            )
                        }
                    </AuthContext.Consumer>
                </ul>
            </nav>
            <div className="services">
                <img src="https://i.imgur.com/Q1iIpAE.png" alt="YouTube" />
                <img src="https://i.imgur.com/xn6Ehfv.png" alt="Twitch" />
                <img src="https://i.imgur.com/Vf6tfih.png" alt="Netflix" />
                <img src="https://i.imgur.com/yN245me.png" alt="Disney+" />
                <img src="https://i.imgur.com/zgsS7Of.png" alt="Prime Video" />
                <img src="https://i.imgur.com/axFodMO.png" alt="Playlist" />
            </div>
            <div className="content">
                <RoomList rooms={rooms} /> {/* Truyền `rooms` vào `RoomList` */}
            </div>
        </>
    );
};

export default Home;
