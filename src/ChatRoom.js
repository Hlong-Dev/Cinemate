import React, { useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs'; // Sử dụng @stomp/stompjs
import { useParams } from 'react-router-dom';
import './ChatRoom.css'; // Import file CSS
import { getUserFromToken } from './utils/jwtUtils';
import ReactPlayer from 'react-player';

const ChatRoom = () => {
    const { roomId } = useParams(); // Lấy roomId từ URL
    const [messages, setMessages] = useState([]);
    const [stompClient, setStompClient] = useState(null);
    const [messageContent, setMessageContent] = useState('');
    const [connected, setConnected] = useState(false); // Trạng thái kết nối WebSocket
    const currentUser = getUserFromToken()?.username || 'Unknown'; // Lấy tên người dùng từ JWT


    useEffect(() => {
        // Kết nối WebSocket tới Spring Boot
        const socket = new SockJS('http://localhost:8080/ws'); // Kết nối tới endpoint WebSocket
        const stompClient = Stomp.over(socket);

        stompClient.connect({}, () => {
            setConnected(true); // Đánh dấu kết nối hoàn tất
            stompClient.subscribe(`/topic/${roomId}`, (message) => {
                setMessages(prevMessages => [...prevMessages, JSON.parse(message.body)]);
            });
        }, (error) => {
            console.error('STOMP connection error:', error);
            setConnected(false); // Đánh dấu kết nối thất bại
        });
        setStompClient(stompClient);

        // Ngắt kết nối khi component bị hủy
        return () => {
            if (stompClient) {
                stompClient.disconnect();
            }
        };
    }, [roomId]);

    const sendMessage = () => {
        if (stompClient && connected && messageContent.trim()) {
            const chatMessage = {
                sender: currentUser, // Sử dụng tên người dùng từ JWT
                content: messageContent,
                type: "CHAT"
            };
            stompClient.send(`/app/chat.sendMessage/${roomId}`, {}, JSON.stringify(chatMessage));
            setMessageContent(''); // Xóa nội dung tin nhắn sau khi gửi
        } else {
            console.error("Chưa kết nối WebSocket hoặc tin nhắn trống.");
        }
    };

    return (
        <div className="container">
            <div class="headerr">
                <div class="top-bar">
                    <i class="fas fa-times icon-left"></i> 
                    <i class="fas fa-bars icon-left"></i> 
                    <i class="fas fa-cog icon-center"></i>
                    <i class="fas fa-search icon-center"></i>
                    <div class="logo">
                        <img src="https://i.imgur.com/Rp89NPj.png" alt="Rave" />
                    </div>
                    <i class="fas fa-check icon-right"></i> 
                    <i class="fas fa-user-friends icon-right"></i> 
                </div>
            </div>


            {/* Phần video */}
            <div className="main-content">
                <div className="video-section">
                    {/* Thêm phần phát video tại đây */}
                    <ReactPlayer
                        url="https://localhost/video/play" // URL video từ Caddy server
                        className="react-player"
                        playing={true} // Tự động phát video
                        controls={true} // Hiển thị điều khiển video
                        width="100%" // Chiều rộng của video
                        height="100%" // Chiều cao của video
                    />
                </div>
                {/* Phần chat */}
                <div className="chat-section">
                    <div className="chat-messages" id="chatMessages">
                        <ul>
                            {messages.map((message, index) => (
                                <li key={index} className={message.sender === currentUser ? "message-item sent" : "message-item received"}>
                                    <div className={message.sender === currentUser ? "message-container sent-container" : "message-container received-container"}>
                                        {/* Avatar and Message content */}
                                        {message.sender === currentUser ? (
                                            <>
                                                <div className="message-content">
                                                    <div className="message-text">
                                                        <strong></strong>{message.content}
                                                    </div>
                                                </div>
                                                <div className="message-avatar">
                                                    <img src="https://i.imgur.com/uG5mEvD.png" alt="Avatar" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="message-avatar">
                                                    <img src="https://i.imgur.com/uG5mEvD.png" alt="Avatar" />
                                                </div>
                                                <div className="message-content">
                                                    <div className="message-text">
                                                        <strong>{message.sender}: </strong>{message.content}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Ô nhập tin nhắn */}
                    <div className="chat-input-container">
                        <input
                            className="chat-input"
                            type="text"
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}  // Sự kiện nhấn Enter để gửi tin nhắn
                            placeholder="Nhập tin nhắn..."
                        />
                        <button onClick={sendMessage} disabled={!connected} className="send-button">
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>

                    {!connected && <p className="connection-status">Đang kết nối đến máy chủ chat...</p>}
                </div>


            </div>
        </div>
    );
};

export default ChatRoom;
