import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Dùng để điều hướng

const RoomList = () => {
    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        axios.get('https://localhost/api/rooms')
            .then(response => {
                setRooms(response.data);
            })
            .catch(error => {
                console.error("Có lỗi xảy ra khi lấy danh sách phòng:", error);
            });
    }, []);

    return (
        <div>
            <h2>Danh sách các phòng chat</h2>
            <ul>
                {rooms.map(room => (
                    <li key={room.id}>
                        {/* Bấm vào phòng để chuyển hướng tới trang chat của phòng đó */}
                        <Link to={`/room/${room.id}`}>{room.name}</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RoomList;
