import React, { useEffect, useState, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useNavigate, useParams } from 'react-router-dom';
import './ChatRoom.css';
import { getUserFromToken } from './utils/jwtUtils';
import ReactPlayer from 'react-player';
import Compressor from 'compressorjs';
import Header from './components/Header';

const ChatRoom = () => {
    const { roomId } = useParams();
    const [messages, setMessages] = useState([]);
    const [stompClient, setStompClient] = useState(null);
    const [messageContent, setMessageContent] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [connected, setConnected] = useState(false);
    const [usersInRoom, setUsersInRoom] = useState([]);
    const [ownerUsername, setOwnerUsername] = useState(''); // Thêm state để lưu ownerUsername
    const currentUser = getUserFromToken()?.username || 'Unknown';
    const chatMessagesRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Lấy thông tin phòng từ server, bao gồm ownerUsername
        const fetchRoomInfo = async () => {
            try {
                const response = await fetch(`http://localhost:8080/api/rooms/${roomId}`);
                const roomData = await response.json();
                setOwnerUsername(roomData.ownerUsername); // Lưu ownerUsername vào state
            } catch (error) {
                console.error("Lỗi khi lấy thông tin phòng:", error);
            }
        };

        fetchRoomInfo(); // Gọi hàm để lấy thông tin phòng khi component được mount

        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            heartbeatIncoming: 20000,
            heartbeatOutgoing: 20000,
            onConnect: () => {
                setConnected(true);

                const joinMessage = {
                    sender: currentUser,
                    type: 'JOIN'
                };
                client.publish({
                    destination: `/app/chat.addUser/${roomId}`,
                    body: JSON.stringify(joinMessage),
                });

                // Subscribe to the chat room to receive messages
                client.subscribe(`/topic/${roomId}`, (message) => {
                    const receivedMessage = JSON.parse(message.body);

                    // Kiểm tra nếu nhận được thông báo chủ phòng thoát
                    if (receivedMessage.type === 'OWNER_LEFT') {
                        // Chỉ hiển thị thông báo nếu người dùng không phải là chủ phòng
                        if (currentUser !== ownerUsername) {
                            alert("Chủ phòng đã thoát. Bạn sẽ được chuyển về trang chủ.");
                            navigate('/home');
                        }
                        return; // Dừng tại đây nếu là thông báo OWNER_LEFT
                    }

                    // Xử lý sự kiện JOIN/LEAVE để cập nhật danh sách người dùng
                    if (receivedMessage.type === 'JOIN') {
                        setUsersInRoom(prevUsers => [...prevUsers, receivedMessage.sender]);
                    } else if (receivedMessage.type === 'LEAVE') {
                        setUsersInRoom(prevUsers => prevUsers.filter(user => user !== receivedMessage.sender));
                    }

                    setMessages(prevMessages => [...prevMessages, receivedMessage]);
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                setConnected(false);
            },
            onWebSocketClose: () => {
                console.error('WebSocket connection closed, attempting to reconnect...');
                setConnected(false);
            },
            onWebSocketError: (error) => {
                console.error('WebSocket error occurred: ', error);
                setConnected(false);
            },
        });

        client.activate();
        setStompClient(client);

        return () => {
            if (client && client.connected) {
                const leaveMessage = {
                    sender: currentUser,
                    type: 'LEAVE'
                };
                try {
                    client.publish({
                        destination: `/app/chat.removeUser/${roomId}`,
                        body: JSON.stringify(leaveMessage),
                    });
                } catch (error) {
                    console.error("Không thể gửi tin nhắn leave, STOMP connection không sẵn sàng.", error);
                }
            }
            client.deactivate();
        };
    }, [roomId, currentUser, ownerUsername, navigate]);




    // Automatically scroll to the bottom when messages are updated
    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = () => {
        // Kiểm tra nếu STOMP client đã kết nối và có nội dung hoặc hình ảnh để gửi
        if (stompClient && stompClient.connected && (messageContent.trim() || selectedImage)) {
            const chatMessage = {
                sender: currentUser,
                content: messageContent.trim(),
                image: null, // Sẽ được cập nhật nếu có hình ảnh
                type: "CHAT" // Giữ nguyên kiểu là CHAT để có thể chứa cả văn bản và hình ảnh
            };

            if (selectedImage) {
                new Compressor(selectedImage, {
                    quality: 0.3,
                    maxWidth: 800,
                    maxHeight: 800,
                    mimeType: 'image/jpeg',
                    success(result) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64Image = reader.result;
                            const base64Size = base64Image.length * (3 / 4) / 1024;

                            if (base64Size <= 64) { // Kiểm tra kích thước ảnh
                                chatMessage.image = base64Image.split(',')[1]; // Lưu trữ ảnh dưới dạng base64
                            } else {
                                console.error('Kích thước ảnh quá lớn, hãy thử nén thêm.');
                                return; // Dừng hàm nếu ảnh quá lớn
                            }

                            try {
                                stompClient.publish({
                                    destination: `/app/chat.sendMessage/${roomId}`,
                                    body: JSON.stringify(chatMessage)
                                });
                            } catch (error) {
                                console.error("Không thể gửi tin nhắn, STOMP connection không sẵn sàng.", error);
                            }

                            setMessageContent('');
                            setSelectedImage(null); // Xóa ảnh đã chọn sau khi gửi
                        };
                        reader.readAsDataURL(result);
                    },
                    error(err) {
                        console.error('Compression error:', err);
                    },
                });
            } else {
                // Nếu không có hình ảnh, chỉ gửi văn bản
                try {
                    stompClient.publish({
                        destination: `/app/chat.sendMessage/${roomId}`,
                        body: JSON.stringify(chatMessage)
                    });
                    setMessageContent('');
                } catch (error) {
                    console.error("Không thể gửi tin nhắn, STOMP connection không sẵn sàng.", error);
                }
            }

            // Nếu có cả văn bản và hình ảnh, đảm bảo cả hai đều được gửi
            if (selectedImage) {
                // Xử lý gửi hình ảnh đã thực hiện ở trên
            } else {
                // Gửi chỉ văn bản
            }
        } else {
            console.error("WebSocket chưa kết nối hoặc tin nhắn trống.");
        }
    };



    const handleImageUpload = (e) => {
        if (e.target.files[0]) {
            setSelectedImage(e.target.files[0]); // Set the selected image
            inputRef.current.focus(); // Focus back to input after selecting an image
        }
    };

    return (
        <div className="container">
            <Header usersInRoom={usersInRoom} /> {/* Truyền danh sách người dùng qua Header */}


            <div className="main-content">
                <div className="video-section">
                    <ReactPlayer
                        url="https://localhost/video/play"
                        className="react-player"
                        playing={true}
                        controls={true}
                        width="100%"
                        height="100%"
                    />
                </div>
                <div className="chat-section">
                    <div className="chat-messages" id="chatMessages" ref={chatMessagesRef}>
                        <ul>
                            {messages.map((message, index) => {
                                const previousMessageSender = index > 0 ? messages[index - 1].sender : null;
                                const isSameSenderAsPrevious = message.sender === previousMessageSender;

                                // Kiểm tra nếu tin nhắn trước đó là JOIN
                                const previousMessageWasJoin = index > 0 ? messages[index - 1].type === 'JOIN' : false;

                                // Tạo kiểu khác biệt cho thông báo JOIN/LEAVE
                                if (message.type === 'JOIN' || message.type === 'LEAVE') {
                                    return (
                                        <li key={index} className="message-item system-notification">
                                            <div className="system-message-container">
                                                {/* Hiển thị avatar của người dùng khi tham gia hoặc rời khỏi */}
                                                <div className="message-avatar">
                                                    <img src="https://i.imgur.com/Tr9qnkI.jpeg" alt="Avatar" />
                                                </div>
                                                <div className="message-content">
                                                    <em>{message.sender} {message.type === 'JOIN' ? 'has joined the Room' : 'has left the Room'}</em>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                }

                                // Các tin nhắn thông thường
                                return (
                                    <li key={index} className={message.sender === currentUser ? "message-item sent" : "message-item received"}>
                                        <div className={message.sender === currentUser ? "message-container sent-container" : "message-container received-container"}>

                                            {/* Hiển thị avatar và tên người gửi nếu là tin nhắn mới hoặc người gửi khác */}
                                            {!isSameSenderAsPrevious && message.sender !== currentUser && (
                                                <>
                                                    <div className="message-avatar">
                                                        <img src="https://i.imgur.com/Tr9qnkI.jpeg" alt="Avatar" />
                                                    </div>
                                                    <div className="message-username">
                                                        <strong>{message.sender}:</strong>
                                                    </div>
                                                </>
                                            )}

                                            {/* Hiển thị avatar cho người dùng hiện tại nếu là tin nhắn mới */}
                                            {!isSameSenderAsPrevious && message.sender === currentUser && (
                                                <div className="message-avatar">
                                                    <img src="https://i.imgur.com/Tr9qnkI.jpeg" alt="Avatar" />
                                                </div>
                                            )}

                                            {/* Hiển thị văn bản và hình ảnh trong cùng một khối */}
                                            <div className="message-content">
                                                {/* Hiển thị nội dung văn bản nếu có */}
                                                {message.content && (
                                                    <div className="message-text">
                                                        {message.content}
                                                    </div>
                                                )}

                                                {/* Hiển thị hình ảnh nếu có */}
                                                {message.image && (
                                                    <div className="message-image">
                                                        <img src={`data:image/png;base64,${message.image}`} alt="Sent Image" style={{ maxWidth: '200px', marginTop: '10px' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                    </div>

                    {/* Display image preview above the input */}
                    {selectedImage && (
                        <div className="image-preview-container">
                            <img src={URL.createObjectURL(selectedImage)} alt="Preview" style={{ maxWidth: '200px', marginBottom: '10px' }} />
                            <button onClick={() => setSelectedImage(null)} style={{ marginLeft: '10px' }}>Remove</button>
                        </div>
                    )}

                    <div className="chat-input-container">
                        <input
                            className="chat-input"
                            type="text"
                            value={messageContent}
                            ref={inputRef} // Reference for input
                            onChange={(e) => setMessageContent(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="Chat"
                        />

                        <label htmlFor="imageUpload" style={{ cursor: 'pointer' }}>
                            <img src="https://i.imgur.com/CqCdOHG.png" alt="Upload Icon" style={{ width: '30px', height: '30px', marginLeft: '10px' }} />
                        </label>
                        <input
                            id="imageUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload} // Handle image upload
                            style={{ display: 'none' }} // Hide the input, we use the label with the icon for the click event
                        />
                    </div>

                    {!connected && <p className="connection-status">Đang kết nối đến máy chủ chat...</p>}
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;
