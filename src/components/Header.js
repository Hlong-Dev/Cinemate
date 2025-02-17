// Header.js
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faBars, faCog, faSearch, faCheck, faUserFriends, faGlobe, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useParams } from 'react-router-dom';
import '../Header.css';

const Header = ({ usersInRoom, onSearchClick, onQueueClick }) => { // Thêm onSearchClick vào props
    const { roomId } = useParams(); // Lấy roomId từ URL
    const [showPopup, setShowPopup] = useState(false);
    const [showUserList, setShowUserList] = useState(false); // Trạng thái để hiển thị danh sách người dùng
    const navigate = useNavigate();

    const handleLeaveClick = () => {
        setShowPopup(true); // Hiển thị popup khi bấm nút X
    };

    const handleLeaveConfirm = async () => {
        setShowPopup(false);
        const token = localStorage.getItem('token'); // Lấy mã JWT từ localStorage

        try {
            console.log("Sending DELETE request to server...");

            const response = await fetch(`https://colkidclub-hutech.id.vn/api/rooms/${roomId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`, // Đính kèm mã JWT
                },
            });

            // Kiểm tra xem yêu cầu DELETE có thành công không
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            console.log("Room deleted successfully");
            navigate('/home'); // Điều hướng về trang home sau khi xóa thành công
        } catch (error) {
            console.error('Error deleting room:', error);
        }
    };

    const handleStay = () => {
        setShowPopup(false); // Ẩn popup khi chọn "Stay"
    };

    const toggleUserList = () => {
        setShowUserList(!showUserList); // Toggle hiển thị danh sách người dùng
    };

    return (
        <div className="headerr">
            <div className="top-bar">
                <div className="item" onClick={handleLeaveClick}>
                    <FontAwesomeIcon icon={faTimes} className="icon" />
                </div>
                <div className="item"><FontAwesomeIcon icon={faBars} className="icon" /></div>
                <div className="item"><FontAwesomeIcon icon={faCog} className="icon" /></div>
                <div className="item" onClick={onSearchClick}> {/* Thêm onClick handler */}
                    <FontAwesomeIcon icon={faSearch} className="icon" />
                </div>
                <div className="item logo">
                    <img src="https://i.imgur.com/Rp89NPj.png" alt="Rave" />
                </div>
                <div className="item" onClick={onQueueClick}>
                    <FontAwesomeIcon icon={faCheck} className="icon" />
                </div>
                <div className="item"><FontAwesomeIcon icon={faUserFriends} className="icon" /></div>
                <div className="item"><FontAwesomeIcon icon={faGlobe} className="icon" /></div>
                <div className="item" onClick={toggleUserList}>
                    <FontAwesomeIcon icon={faUsers} className="icon" />
                </div>
            </div>

            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup">
                        <p>Leave the CINEMATE?</p>
                        <div className="popup-buttons">
                            <button className="popup-button" onClick={handleStay}>Stay</button>
                            <button className="popup-button" onClick={handleLeaveConfirm}>Leave</button>
                        </div>
                    </div>
                </div>
            )}

            {showUserList && (
                <div className="user-list">
                    <div className="user-list-header">
                        <p>Users in Room</p>
                    </div>
                    <ul>
                        {usersInRoom.map((user, index) => (
                            <li key={index}>
                                <img src="https://i.imgur.com/Tr9qnkI.jpeg" alt="Avatar" className="user-avatar" />
                                <span>{user}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Header;
