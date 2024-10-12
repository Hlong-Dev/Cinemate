import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './RoomList.css';

const RoomList = () => {
    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        axios.get('https://ddf1-183-91-29-130.ngrok-free.app/api/rooms')
            .then(response => {
                setRooms(response.data);
            })
            .catch(error => {
                console.error("Có lỗi xảy ra khi lấy danh sách phòng:", error);
            });
    }, []);

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
                            <div className="room-participants">
                                {(room.participants || []).map((participant, index) => (
                                    <img
                                        key={index}
                                        src={participant.avatar}
                                        alt="Participant Avatar"
                                        className="participant-avatar"
                                    />
                                ))}
                            </div>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
};

export default RoomList;
