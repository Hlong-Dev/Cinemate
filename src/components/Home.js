import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import LogoutButton from './LogoutButton';
import RoomList from '../RoomList';
import { Link, useNavigate } from 'react-router-dom';
import '../Home.css';

const Home = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user } = useContext(AuthContext); // Lấy thông tin user từ context
    const sidebarRef = useRef(null);
    const [rooms, setRooms] = useState([]); // Thêm state để lưu danh sách phòng
    const navigate = useNavigate(); // Sử dụng navigate từ react-router-dom

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
            const roomsData = await response.json();
            setRooms(roomsData);
        } catch (error) {
            console.error("Error fetching rooms:", error);
        }
    };

    const createRoom = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch("https://ddf1-183-91-29-130.ngrok-free.app/api/rooms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const newRoom = await response.json(); // Lấy thông tin phòng mới từ server
                navigate(`/room/${newRoom.id}`); // Điều hướng vào phòng vừa tạo
            } else {
                console.error("Failed to create room");
            }
        } catch (error) {
            console.error("Error creating room:", error);
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
                <RoomList rooms={rooms} />
            </div>

        </>
    );
};

export default Home;
