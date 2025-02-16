// src/components/Home.js
import React, { useState, useRef, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import LogoutButton from './LogoutButton';
import RoomList from '../RoomList';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../Home.css';

const Home = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user } = useContext(AuthContext);
    const sidebarRef = useRef(null);
    const navigate = useNavigate();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const createRoomWithVideo = async (videoId, videoTitle) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch("https://colkidclub-hutech.id.vn/api/rooms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const newRoom = await response.json();
                // Chuyển hướng đến phòng mới với thông tin video trong URL params
                navigate(`/room/${newRoom.id}?videoId=${videoId}&autoplay=true`);
            } else {
                console.error("Failed to create room");
            }
        } catch (error) {
            console.error("Error creating room:", error);
        }
    };

    const createRoom = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch("https://colkidclub-hutech.id.vn/api/rooms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const newRoom = await response.json();
                navigate(`/room/${newRoom.id}`);
            } else {
                console.error("Failed to create room");
            }
        } catch (error) {
            console.error("Error creating room:", error);
        }
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [youtubeResults, setYoutubeResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState(0);
    const API_KEY = 'AIzaSyBL1HyURHH5Sdb9iNK-8jlPNTooqwy-fns';

    // Thêm function search YouTube
    const searchYoutubeVideos = async (term) => {
        try {
            if (!term.trim()) {
                setYoutubeResults([]);
                setIsLoading(false);
                setImagesLoaded(0);
                return;
            }

            setIsLoading(true);
            setImagesLoaded(0);
            const response = await axios.get(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${term}&type=video&key=${API_KEY}&maxResults=20`
            );
            setYoutubeResults(response.data.items);
        } catch (error) {
            console.error('Error fetching YouTube results:', error);
            setIsLoading(false);
            setImagesLoaded(0);
        }
    };

    // Debounce search to reduce API calls
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm) {
                searchYoutubeVideos(searchTerm);
            } else {
                setYoutubeResults([]);
                setIsLoading(false);
                setImagesLoaded(0);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Track image loading
    useEffect(() => {
        if (youtubeResults.length > 0) {
            // Reset image load tracking
            setImagesLoaded(0);

            // Create image loaders for each thumbnail
            const imageLoaders = youtubeResults.map((video) => {
                const img = new Image();
                img.src = video.snippet.thumbnails.medium.url;
                img.onload = () => {
                    setImagesLoaded((prev) => prev + 1);
                };
                img.onerror = () => {
                    setImagesLoaded((prev) => prev + 1);
                };
                return img;
            });

            // Cleanup function to remove image loaders
            return () => {
                imageLoaders.forEach(img => {
                    img.onload = null;
                    img.onerror = null;
                });
            };
        }
    }, [youtubeResults]);

    // Automatically stop loading when all images are loaded
    useEffect(() => {
        if (youtubeResults.length > 0 && imagesLoaded === youtubeResults.length) {
            setIsLoading(false);
        }
    }, [imagesLoaded, youtubeResults]);

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
                    <input
                        type="text"
                        placeholder="search video, series, or film..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {/* Loading bar */}
            {isLoading && (
                <div className="loading-bar-container">
                    <div className="loading-bar"></div>
                </div>
            )}

            {/* Hiển thị kết quả tìm kiếm */}
            {youtubeResults.length > 0 ? (
                <div className="youtube-results-row">
                    {youtubeResults.map((video) => (
                        <div
                            key={video.id.videoId}
                            className="video-card"
                            onClick={() => createRoomWithVideo(video.id.videoId, video.snippet.title)}
                        >
                            <img
                                src={video.snippet.thumbnails.medium.url}
                                alt={video.snippet.title}
                                className="video-thumbnail"
                            />
                            <div className="video-info">
                                <h3>{video.snippet.title}</h3>
                                <p>{video.snippet.channelTitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="services">
                        <div className="service-item">
                            <img src="https://i.imgur.com/Q1iIpAE.png" alt="YouTube" />
                        </div>
                        <div className="service-item">
                            <img src="https://i.imgur.com/xn6Ehfv.png" alt="Twitch" />
                        </div>
                        <div className="service-item">
                            <img src="https://i.imgur.com/Vf6tfih.png" alt="Netflix" />
                        </div>
                        <div className="service-item">
                            <img src="https://i.imgur.com/yN245me.png" alt="Disney+" />
                        </div>
                        <div className="service-item">
                            <img src="https://i.imgur.com/zgsS7Of.png" alt="Prime Video" />
                        </div>
                        <div className="service-item">
                            <img src="https://i.imgur.com/axFodMO.png" alt="Playlist" />
                        </div>
                        <div className="service-item">
                            <img src="https://i.imgur.com/gNSGsSN.png" alt="tubi" />
                        </div>
                        <div className="service-item">
                            <img src="https://i.imgur.com/MEXsqoF.png" alt="gg" />
                        </div>
                        <div className="service-item">
                            <img src="https://i.imgur.com/QMVPZjU.png" alt="gg drive" className="white-icon" />
                        </div>
                        <div className="service-item">
                            <img src="https://i.imgur.com/s2O07An.png" alt="Playlist" />
                        </div>
                    </div>

                    <div className="content">
                        <RoomList />
                    </div>
                </>
            )}

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
        </>
    );
};

export default Home;