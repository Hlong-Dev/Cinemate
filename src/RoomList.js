import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './RoomList.css';

const RoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await fetch("https://colkidclub-hutech.id.vn/api/rooms", {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const roomsData = await response.json();

                // Xử lý để lấy video ID từ các định dạng URL khác nhau của YouTube
                const processedRooms = roomsData.map(room => {
                    if (room.currentVideoUrl) {
                        let videoId = null;

                        // Xử lý các định dạng URL khác nhau
                        if (room.currentVideoUrl.includes('youtu.be/')) {
                            videoId = room.currentVideoUrl.split('youtu.be/')[1]?.split('?')[0];
                        } else if (room.currentVideoUrl.includes('youtube.com/watch')) {
                            videoId = room.currentVideoUrl.split('v=')[1]?.split('&')[0];
                        }

                        if (videoId) {
                            return {
                                ...room,
                                videoThumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
                            };
                        }
                    }
                    return room;
                });

                setRooms(processedRooms);
            } catch (error) {
                console.error("Error fetching rooms:", error);
                setError("Có lỗi xảy ra khi tải danh sách phòng.");
            }
        };

        fetchRooms();
        const interval = setInterval(fetchRooms, 5000);
        return () => clearInterval(interval);
    }, []);

    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="room-list">
            {rooms.map(room => (
                <Link to={`/room/${room.id}`} key={room.id} className="room-card">
                    <div className="room-thumbnail">
                        <img
                            src={room.videoThumbnail || room.thumbnail}
                            alt={room.currentVideoTitle || room.name}
                            className="video-thumbnail"
                        />
                        <div className="video-overlay">
                            <h3 className="video-title">
                                {room.currentVideoTitle || 'Chưa có video đang phát'}
                            </h3>
                            <div className="room-name">
                                {room.name}
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};

export default RoomList;