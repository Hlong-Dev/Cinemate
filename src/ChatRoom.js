import React, { useEffect, useState, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useParams } from 'react-router-dom';
import './ChatRoom.css';
import { getUserFromToken } from './utils/jwtUtils';
import ReactPlayer from 'react-player';
import Compressor from 'compressorjs';

const ChatRoom = () => {
    const { roomId } = useParams();
    const [messages, setMessages] = useState([]);
    const [stompClient, setStompClient] = useState(null);
    const [messageContent, setMessageContent] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // State to store selected image
    const [connected, setConnected] = useState(false);
    const currentUser = getUserFromToken()?.username || 'Unknown';
    const chatMessagesRef = useRef(null); // Reference to the chat messages container
    const inputRef = useRef(null); // Reference to the input field

    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000, // Attempt to reconnect every 5 seconds
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            onConnect: () => {
                setConnected(true);

                // Send a join message when connected
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
                    setMessages(prevMessages => [...prevMessages, receivedMessage]);
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
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
            if (client) {
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

                client.deactivate();
            }
        };
    }, [roomId, currentUser]);


    // Automatically scroll to the bottom when messages are updated
    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = () => {
        // Check if the STOMP client is connected
        if (stompClient && stompClient.connected && (messageContent.trim() || selectedImage)) {
            const chatMessage = {
                sender: currentUser,
                content: messageContent || '',
                image: null, // No image yet
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
                            const base64Image = reader.result;
                            const base64Size = base64Image.length * (3 / 4) / 1024;

                            if (base64Size <= 64) {
                                chatMessage.image = base64Image.split(',')[1];
                                chatMessage.type = "IMAGE";
                            } else {
                                console.error('Kích thước ảnh quá lớn, hãy thử nén thêm.');
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
                            setSelectedImage(null); // Clear the selected image after sending
                        };
                        reader.readAsDataURL(result);
                    },
                    error(err) {
                        console.error('Compression error:', err);
                    },
                });
            } else {
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
            <div className="headerr">
                <div className="top-bar">
                    <i className="fas fa-times icon-left"></i>
                    <i className="fas fa-bars icon-left"></i>
                    <i className="fas fa-cog icon-center"></i>
                    <i className="fas fa-search icon-center"></i>
                    <div className="logo">
                        <img src="https://i.imgur.com/Rp89NPj.png" alt="Rave" />
                    </div>
                    <i className="fas fa-check icon-right"></i>
                    <i className="fas fa-user-friends icon-right"></i>
                </div>
            </div>

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

                                return (
                                    <li key={index} className={message.type === 'JOIN' || message.type === 'LEAVE' ? "message-item system-notification" : message.sender === currentUser ? "message-item sent" : "message-item received"}>
                                        <div className={message.type === 'JOIN' || message.type === 'LEAVE' ? "system-message-container" : message.sender === currentUser ? "message-container sent-container" : "message-container received-container"}>

                                            {/* Only show avatar and username if this message is from a new sender */}
                                            {!isSameSenderAsPrevious && (
                                                <>
                                                    <div className="message-avatar">
                                                        <img src="https://i.imgur.com/Tr9qnkI.jpeg" alt="Avatar" />
                                                    </div>
                                                    <div className="message-username">
                                                        <strong>{message.sender}:</strong>
                                                    </div>
                                                </>
                                            )}

                                            {message.type === 'JOIN' ? (
                                                <div className="system-message">
                                                    <em>{message.sender} has joined the chat</em>
                                                </div>
                                            ) : message.type === 'LEAVE' ? (
                                                <div className="system-message">
                                                    <em>{message.sender} has left the chat</em>
                                                </div>
                                            ) : (
                                                <>
                                                    {message.type === 'IMAGE' && message.image && (
                                                        <div className="message-image">
                                                            <img src={`data:image/png;base64,${message.image}`} alt="Sent Image" style={{ maxWidth: '200px', marginTop: '10px' }} />
                                                        </div>
                                                    )}
                                                    {message.content && (
                                                        <div className="message-content">
                                                            <div className="message-text">
                                                                {isSameSenderAsPrevious ? message.content : null}
                                                                {!isSameSenderAsPrevious && (
                                                                    <>
                                                                        {message.content}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
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
