import React, { useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import LogoutButton from './LogoutButton';
import RoomList from '../RoomList';  // Import RoomList component
import { Link } from 'react-router-dom';

const Home = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarRef = useRef(null); // Create a reference to the sidebar

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Close sidebar when clicking outside of it
    useEffect(() => {
        function handleClickOutside(event) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false); // Close sidebar if clicking outside of it
            }
        }

        // Add event listener for clicks
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            // Cleanup the event listener
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [sidebarRef]);

    return (
        <>
            <header className="header">
                <div className="top-bar">
                    <div className="menu-icon" onClick={toggleSidebar}>
                        <span>&#9776;</span> {/* Menu icon */}
                    </div>
                    <div className="logo">
                        <img src="https://i.imgur.com/Rp89NPj.png" alt="YouTube" />
                    </div>
                </div>

                <div className="divider"></div> {/* Đường kẻ ngang */}

                <div className="search-bar">
                    <i className="fas fa-search search-icon"></i> {/* Search icon từ Font Awesome */}
                    <input type="text" placeholder="search video, series, or film..." />
                </div>
            </header>

            {/* Sidebar */}
            <nav ref={sidebarRef} className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <ul>
                    <li>
                        <Link to="/">Home</Link>
                    </li>
                    <li>
                        <Link to="/dashboard">Dashboard</Link>
                    </li>
                    <AuthContext.Consumer>
                        {({ user }) =>
                            user ? (
                                <li>
                                    <LogoutButton />
                                </li>
                            ) : (
                                <li>
                                    <Link to="/login">Login</Link>
                                </li>
                            )
                        }
                    </AuthContext.Consumer>
                </ul>
            </nav>

            {/* Main content */}
            <div className="services">
                <img src="https://i.imgur.com/Q1iIpAE.png" alt="YouTube" />
                <img src="/twitch.png" alt="Twitch" />
                <img src="https://i.imgur.com/Vf6tfih.png" alt="Netflix" />
                <img src="/disney.png" alt="Disney+" />
                <img src="/prime.png" alt="Prime Video" />
                <img src="/playlist.png" alt="Playlist" />
                <img src="/drive.png" alt="Google Drive" />
                <img src="/rave.png" alt="Rave" />
            </div>

            <div className="content">
                <RoomList />
            </div>

            <div className="mature-toggle">
                <label>Hide mature content</label>
                <input type="checkbox" />
            </div>
        </>
    );
};

export default Home;
