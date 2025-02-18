import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './RoomList.css';

const RoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

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
                    let videoId = null;
                    if (room.currentVideoUrl) {
                        // Xử lý các định dạng URL khác nhau
                        if (room.currentVideoUrl.includes('youtu.be/')) {
                            videoId = room.currentVideoUrl.split('youtu.be/')[1]?.split('?')[0];
                        } else if (room.currentVideoUrl.includes('youtube.com/watch')) {
                            videoId = room.currentVideoUrl.split('v=')[1]?.split('&')[0];
                        }
                        if (videoId) {
                            return {
                                ...room,
                                videoThumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                                videoId: videoId
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

    // Hàm xử lý điều hướng với video
    const handleRoomJoin = (room) => {
        if (room.currentVideoUrl) {
            // Nếu có video, chuyển hướng với thông tin video
            navigate(`/room/${room.id}?videoId=${room.videoId}&autoplay=true`);
        } else {
            // Nếu không có video, chuyển hướng bình thường
            navigate(`/room/${room.id}`);
        }
    };

    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="room-list">
            {rooms.map(room => (
                <div
                    key={room.id}
                    className="room-card"
                    onClick={() => handleRoomJoin(room)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="room-thumbnail">
                        <img
                            src={room.videoThumbnail || room.thumbnail}
                            alt={room.currentVideoTitle || room.name}
                            className="videoo-thumbnail"
                        />
                        <div className="videoo-overlay">
                            <h3 className="videoo-title">
                                {room.currentVideoTitle || 'Chưa có video đang phát'}
                            </h3>
                            <div className="room-name">
                                {room.name}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RoomList;