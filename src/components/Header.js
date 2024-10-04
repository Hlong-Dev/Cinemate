import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faBars, faCog, faSearch, faCheck, faUserFriends, faGlobe, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import '../Header.css';

const Header = ({ usersInRoom }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [showUserList, setShowUserList] = useState(false); // Trạng thái để hiển thị danh sách người dùng
    const navigate = useNavigate();

    const handleLeaveClick = () => {
        setShowPopup(true); // Hiển thị popup khi bấm nút X
    };

    const handleLeaveConfirm = () => {
        setShowPopup(false);
        navigate('/home'); // Điều hướng về trang home
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
                <div className="item"><FontAwesomeIcon icon={faSearch} className="icon" /></div>
                <div className="item logo">
                    <img src="https://i.imgur.com/Rp89NPj.png" alt="Rave" />
                </div>
                <div className="item"><FontAwesomeIcon icon={faCheck} className="icon" /></div>
                <div className="item"><FontAwesomeIcon icon={faUserFriends} className="icon" /></div>
                <div className="item"><FontAwesomeIcon icon={faGlobe} className="icon" /></div>
                <div className="item" onClick={toggleUserList}> {/* Thêm sự kiện onClick để hiển thị danh sách người dùng */}
                    <FontAwesomeIcon icon={faUsers} className="icon" />
                </div>
            </div>

            {/* Hiển thị popup khi showPopup là true */}
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

            {/* Hiển thị danh sách người dùng khi showUserList là true */}
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
