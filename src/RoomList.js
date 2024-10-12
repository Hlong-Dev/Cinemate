import React from 'react';
import { Link } from 'react-router-dom';
import './RoomList.css';

const RoomList = ({ rooms }) => {
    // Kiểm tra nếu `rooms` là một mảng hợp lệ trước khi gọi `map`
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
                            {/* Hiển thị thêm thông tin nếu có */}
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
};

export default RoomList;
