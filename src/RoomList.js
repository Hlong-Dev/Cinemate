import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './RoomList.css';

const RoomList = () => {
    const [rooms, setRooms] = useState([]);
    const [error, setError] = useState(null); // Để lưu lỗi nếu có

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await fetch("https://seeker-young-traveller-statutes.trycloudflare.com/api/rooms");

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Received non-JSON response from server");
                }

                const roomsData = await response.json();
                setRooms(roomsData);
            } catch (error) {
                console.error("Error fetching rooms:", error);
                setError("Có lỗi xảy ra khi tải danh sách phòng.");
            }
        };

        fetchRooms();
    }, []);

    if (error) {
        return <div>{error}</div>;
    }

    if (!Array.isArray(rooms)) {
        return <div>Error: Rooms data is not an array</div>;
    }

    return (
        <div className="room-list">
            {rooms.map(room => (
                <div key={room.id} className="room-item">
                    <Link to={`/room/${room.id}`} className="room-link">
                        <div className="room-thumbnail">
                            <img src={room.thumbnail} alt={`${room.name} Thumbnail`} />
                        </div>
                        <div className="room-info">
                            <h3 className="room-title">{room.name}</h3>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
};

export default RoomList;
