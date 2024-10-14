﻿import React, { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';  // Không cần SockJS nữa
import { useNavigate, useParams } from 'react-router-dom';
import './ChatRoom.css';
import { getUserFromToken } from './utils/jwtUtils';
import Compressor from 'compressorjs';
import Header from './components/Header';
import ReactPlayer from 'react-player';

const ChatRoom = () => {
    const { roomId } = useParams();
    const [messages, setMessages] = useState([]);
    const [messageContent, setMessageContent] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [connected, setConnected] = useState(false);
    const [usersInRoom, setUsersInRoom] = useState([]);
    const [ownerUsername, setOwnerUsername] = useState('');
    const [videoList, setVideoList] = useState([]); // Quản lý danh sách video
    const [currentVideoUrl, setCurrentVideoUrl] = useState(''); // Quản lý video đang phát
    const [showVideoList, setShowVideoList] = useState(true);
    const currentUser = getUserFromToken() || { username: 'Unknown', avtUrl: 'https://i.imgur.com/WxNkK7J.png' };
    const chatMessagesRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Tạo một ref để lưu giữ instance của stompClient
    const stompClientRef = useRef(null);

    useEffect(() => {
        const fetchRoomInfo = async () => {
            try {
                const response = await fetch(`https://colkidclub-hutech.id.vn/api/rooms/${roomId}`, {
                    credentials: 'include',
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const roomData = await response.json();
                setOwnerUsername(roomData.ownerUsername);
            } catch (error) {
                console.error("Lỗi khi lấy thông tin phòng:", error);
            }
        };

        fetchRoomInfo();
        const fetchVideoList = async () => {
            try {
                const response = await fetch('https://colkidclub-hutech.id.vn/video/list'); // Gọi API để lấy danh sách video
                const videos = await response.json();
                setVideoList(videos); // Lưu danh sách video vào state
            } catch (error) {
                console.error("Lỗi khi lấy danh sách video:", error);
            }
        };

        fetchVideoList();
        // Chỉ khởi tạo WebSocket nếu stompClient chưa được tạo
        if (!stompClientRef.current) {
            const client = new Client({
                brokerURL: 'wss://colkidclub-hutech.id.vn/ws',
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                onConnect: () => {
                    setConnected(true);
                    const joinMessage = {
                        sender: currentUser.username,
                        avtUrl: currentUser.avtUrl,
                        type: 'JOIN'
                    };
                    client.publish({
                        destination: `/app/chat.addUser/${roomId}`,
                        body: JSON.stringify(joinMessage),
                    });
                    client.subscribe(`/topic/${roomId}`, (message) => {
                        const receivedMessage = JSON.parse(message.body);
                        if (receivedMessage.type === 'OWNER_LEFT' && currentUser.username !== ownerUsername) {
                            alert("Chủ phòng đã thoát. Bạn sẽ được chuyển về trang chủ.");
                            navigate('/home');
                            return;
                        }
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

            // Lưu instance của stompClient vào ref
            stompClientRef.current = client;
            client.activate();
        }

        // Cleanup khi component unmount
        return () => {
            if (stompClientRef.current && stompClientRef.current.connected) {
                const leaveMessage = {
                    sender: currentUser.username,
                    avtUrl: currentUser.avtUrl,
                    type: 'LEAVE'
                };
                stompClientRef.current.publish({
                    destination: `/app/chat.removeUser/${roomId}`,
                    body: JSON.stringify(leaveMessage),
                });
                stompClientRef.current.deactivate();
            }
        };
    }, [roomId, currentUser.username, currentUser.avtUrl, ownerUsername, navigate]);

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = () => {
        if (stompClientRef.current && stompClientRef.current.connected && (messageContent.trim() || selectedImage)) {
            const chatMessage = {
                sender: currentUser.username,
                avtUrl: currentUser.avtUrl,
                content: messageContent.trim(),
                image: null,
                type: "CHAT"
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
                            const base64Image = reader.result.split(',')[1];
                            chatMessage.image = base64Image;
                            stompClientRef.current.publish({
                                destination: `/app/chat.sendMessage/${roomId}`,
                                body: JSON.stringify(chatMessage)
                            });
                            setMessageContent('');
                            setSelectedImage(null);
                        };
                        reader.readAsDataURL(result);
                    },
                    error(err) {
                        console.error('Compression error:', err);
                    },
                });
            } else {
                stompClientRef.current.publish({
                    destination: `/app/chat.sendMessage/${roomId}`,
                    body: JSON.stringify(chatMessage)
                });
                setMessageContent('');
            }
        } else {
            console.error("WebSocket chưa kết nối hoặc tin nhắn trống.");
        }
    };

    const handleImageUpload = (e) => {
        if (e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
            inputRef.current.focus();
        }
    };
    const playVideo = (video) => {
        setCurrentVideoUrl(video.url); // Sử dụng video.url thay vì toàn bộ đối tượng
        setShowVideoList(false); // Ẩn danh sách video
    };


    return (
        <div className="container">
            <Header usersInRoom={usersInRoom} />

            <div className="main-content">
                <div className="video-section">
                    {showVideoList ? (
                        <div className="grid-container">
                            {videoList.map((video, index) => (
                                <div className="video-card" key={index} onClick={() => playVideo(video)}>
                                    <img
                                        src={`https://colkidclub-hutech.id.vn${video.thumbnail}`} // URL đầy đủ tới ảnh
                                        alt={`Thumbnail of ${video.title}`}
                                        className="thumbnail"
                                    />
                                    <div className="video-info">
                                        <p className="video-title">{video.title}</p>
                                        <span className="video-duration">{video.duration}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                    ) : (
                        <ReactPlayer
                            url={currentVideoUrl}
                            className="react-player"
                            playing={true}
                            controls={true}
                            width="100%"
                            height="100%"
                        />
                    )}
                </div>
                <div className="chat-section">
                    <div className="chat-messages" id="chatMessages" ref={chatMessagesRef}>
                        <ul>
                            {messages.map((message, index) => {
                                const isSender = message.sender === currentUser.username;
                                const isSameSenderAsPrevious = index > 0 && message.sender === messages[index - 1].sender;
                                const avtUrl = message.avtUrl || 'https://i.imgur.com/WxNkK7J.png';

                                if (message.type === 'JOIN' || message.type === 'LEAVE') {
                                    return (
                                        <li key={index} className="message-item system-notification">
                                            <div className="system-message-container">
                                                <div className="message-avatar">
                                                    <img src={avtUrl} alt="Avatar" />
                                                </div>
                                                <div className="message-content">
                                                    <em>{message.sender} {message.type === 'JOIN' ? 'has joined the Room' : 'has left the Room'}</em>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                }

                                return (
                                    <li key={index} className={isSender ? "message-item sent" : "message-item received"}>
                                        <div className={isSender ? "message-container sent-container" : "message-container received-container"}>
                                            {!isSender && !isSameSenderAsPrevious && (
                                                <div className="message-header">
                                                    <div className="message-avatar">
                                                        <img src={avtUrl} alt="Avatar" />
                                                    </div>
                                                    <strong className="message-sender">{message.sender}</strong>
                                                </div>
                                            )}
                                            <div className="message-content">
                                                {message.content && <div className="message-text">{message.content}</div>}
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
                            ref={inputRef}
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
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {!connected && <p className="connection-status">Đang kết nối đến máy chủ chat...</p>}
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;
