// ChatRoom.js
import React, { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs'; // Không cần SockJS
import { useNavigate, useParams } from 'react-router-dom';
import './ChatRoom.css';
import { getUserFromToken } from './utils/jwtUtils';
import Compressor from 'compressorjs';
import Header from './components/Header';
import ReactPlayer from 'react-player';

const ChatRoom = () => {
    // Lấy roomId từ URL
    const { roomId } = useParams();

    // Các trạng thái quản lý video
    const [isPlaying, setIsPlaying] = useState(true); // Trạng thái phát/tạm dừng video
    const [videoList, setVideoList] = useState([]); // Danh sách video
    const [currentVideoUrl, setCurrentVideoUrl] = useState(''); // URL video hiện tại
    const [showVideoList, setShowVideoList] = useState(true); // Hiển thị danh sách video

    // Các trạng thái quản lý chat
    const [messages, setMessages] = useState([]); // Danh sách tin nhắn
    const [messageContent, setMessageContent] = useState(''); // Nội dung tin nhắn
    const [selectedImage, setSelectedImage] = useState(null); // Ảnh được chọn để gửi
    const [connected, setConnected] = useState(false); // Trạng thái kết nối WebSocket
    const [usersInRoom, setUsersInRoom] = useState([]); // Danh sách người dùng trong phòng
    const [ownerUsername, setOwnerUsername] = useState(''); // Username của chủ phòng

    // Thông tin người dùng hiện tại
    const currentUser = getUserFromToken() || { username: 'Unknown', avtUrl: 'https://i.imgur.com/WxNkK7J.png' };

    // Refs
    const chatMessagesRef = useRef(null); // Ref để cuộn xuống cuối chat
    const inputRef = useRef(null); // Ref cho input chat
    const navigate = useNavigate(); // Hook điều hướng
    const playerRef = useRef(null); // Ref cho ReactPlayer
    const stompClientRef = useRef(null); // Ref cho stompClient
    const ownerUsernameRef = useRef(''); // Ref cho ownerUsername

    // Refs cho currentVideoUrl và isPlaying
    const currentVideoUrlRef = useRef(currentVideoUrl);
    const isPlayingRef = useRef(isPlaying);

    // Cập nhật refs khi state thay đổi
    useEffect(() => {
        currentVideoUrlRef.current = currentVideoUrl;
    }, [currentVideoUrl]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Xác định xem người dùng hiện tại có phải là chủ phòng hay không
    const isOwner = currentUser.username === ownerUsername;

    // Fetch Room Info
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
                ownerUsernameRef.current = roomData.ownerUsername; // Lưu vào useRef
            } catch (error) {
                console.error("Error fetching room info:", error);
            }
        };

        fetchRoomInfo();
    }, [roomId]);

    // Fetch Video List
    useEffect(() => {
        const fetchVideoList = async () => {
            try {
                const response = await fetch('https://colkidclub-hutech.id.vn/video/list'); // Fetch video list
                const videos = await response.json();
                setVideoList(videos); // Store video list in state
            } catch (error) {
                console.error("Error fetching video list:", error);
            }
        };

        fetchVideoList();
    }, []);

    // Initialize WebSocket
    useEffect(() => {
        // Initialize WebSocket only if not already initialized
        if (!stompClientRef.current) {
            const client = new Client({
                brokerURL: 'wss://colkidclub-hutech.id.vn/ws',
                reconnectDelay: 5000,
                heartbeatIncoming: 10000,
                heartbeatOutgoing: 10000,
                onConnect: () => {
                    console.log('WebSocket connected');
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

                    // Subscription để xử lý tất cả các loại thông điệp
                    client.subscribe(`/topic/${roomId}`, (message) => {
                        const receivedMessage = JSON.parse(message.body);
                        console.log('Received message:', receivedMessage);

                        switch (receivedMessage.type) {
                            case 'OWNER_LEFT':
                                if (currentUser.username !== ownerUsernameRef.current) {
                                    alert("Chủ phòng đã thoát. Bạn sẽ được chuyển về trang chủ.");
                                    navigate('/home');
                                }
                                break;
                            case 'JOIN':
                                setUsersInRoom(prevUsers => [...prevUsers, receivedMessage.sender]);
                                setMessages(prevMessages => [...prevMessages, receivedMessage]); // Thêm vào messages
                                // Nếu là chủ phòng, gửi trạng thái video hiện tại đến người dùng mới
                                if (
                                    currentUser.username === ownerUsernameRef.current &&
                                    playerRef.current &&
                                    currentVideoUrlRef.current // Sử dụng ref để kiểm tra
                                ) {
                                    const videoState = {
                                        videoUrl: currentVideoUrlRef.current,
                                        currentTime: playerRef.current.getCurrentTime(),
                                        isPlaying: isPlayingRef.current,
                                        type: 'VIDEO_UPDATE'
                                    };
                                    console.log('Sending VIDEO_UPDATE:', videoState);
                                    stompClientRef.current.publish({
                                        destination: `/app/chat.videoUpdate/${roomId}`,
                                        body: JSON.stringify(videoState)
                                    });
                                }
                                break;
                            case 'LEAVE':
                                setUsersInRoom(prevUsers => prevUsers.filter(user => user !== receivedMessage.sender));
                                setMessages(prevMessages => [...prevMessages, receivedMessage]); // Thêm vào messages
                                break;
                            case 'VIDEO_UPDATE':
                                handleVideoUpdate(receivedMessage);
                                break;
                            case 'VIDEO_PLAY':
                                handleVideoPlay(receivedMessage);
                                break;
                            case 'VIDEO_PAUSE':
                                handleVideoPause(receivedMessage);
                                break;
                            case 'VIDEO_PROGRESS':
                                handleVideoProgress(receivedMessage);
                                break;
                            default:
                                // Xử lý các thông điệp chat thông thường
                                setMessages(prevMessages => [...prevMessages, receivedMessage]);
                        }
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

            // Save stompClient instance to ref
            stompClientRef.current = client;
            client.activate();
        }

        // Cleanup khi component unmounts
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
                console.log('WebSocket disconnected');
            }
        };
    }, [roomId, currentUser.username, currentUser.avtUrl, navigate]); // Loại bỏ currentVideoUrl và isPlaying khỏi dependencies

    // Cuộn xuống cuối chat khi có tin nhắn mới
    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [messages]);

    // Hàm xử lý VIDEO_UPDATE
    const handleVideoUpdate = (message) => {
        console.log('Handling VIDEO_UPDATE:', message);
        if (message.videoUrl) {
            setCurrentVideoUrl(message.videoUrl);
            setShowVideoList(false);
            setIsPlaying(message.isPlaying); // Cập nhật trạng thái phát
            if (message.currentTime !== undefined && playerRef.current) {
                setTimeout(() => {
                    playerRef.current.seekTo(message.currentTime, 'seconds');
                }, 100); // Đảm bảo video đã tải trước khi tua
            }
        } else {
            // Nếu không có video nào đang phát, hiển thị danh sách video
            setCurrentVideoUrl('');
            setShowVideoList(true);
        }
    };

    // Hàm xử lý VIDEO_PLAY
    const handleVideoPlay = (message) => {
        console.log('Handling VIDEO_PLAY:', message);
        if (message.videoUrl) {
            setCurrentVideoUrl(message.videoUrl);
            setIsPlaying(true);
            setShowVideoList(false);
            if (message.currentTime !== undefined && playerRef.current) {
                setTimeout(() => {
                    playerRef.current.seekTo(message.currentTime, 'seconds');
                }, 100);
            }
        }
    };

    // Hàm xử lý VIDEO_PAUSE
    const handleVideoPause = (message) => {
        console.log('Handling VIDEO_PAUSE:', message);
        if (message.videoUrl) {
            setCurrentVideoUrl(message.videoUrl);
            setIsPlaying(false);
            setShowVideoList(false);
            if (message.currentTime !== undefined && playerRef.current) {
                setTimeout(() => {
                    playerRef.current.seekTo(message.currentTime, 'seconds');
                }, 100);
            }
        }
    };

    // Hàm xử lý VIDEO_PROGRESS (tua video)
    const handleVideoProgress = (message) => {
        console.log('Handling VIDEO_PROGRESS:', message);
        if (message.videoUrl) {
            setCurrentVideoUrl(message.videoUrl);
            setShowVideoList(false);
            if (message.currentTime !== undefined && playerRef.current) {
                setTimeout(() => {
                    playerRef.current.seekTo(message.currentTime, 'seconds');
                }, 100);
            }
        }
    };

    // Hàm gửi tin nhắn
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
                            console.log('Sending CHAT message with image:', chatMessage);
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
                console.log('Sending CHAT message:', chatMessage);
                stompClientRef.current.publish({
                    destination: `/app/chat.sendMessage/${roomId}`,
                    body: JSON.stringify(chatMessage)
                });
                setMessageContent('');
            }
        } else {
            console.error("WebSocket not connected or message is empty.");
        }
    };

    // Hàm xử lý upload ảnh
    const handleImageUpload = (e) => {
        if (e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
            inputRef.current.focus();
        }
    };

    // Hàm chọn video để phát
    const playVideo = (video) => {
        if (!isOwner) {
            alert("Chỉ chủ phòng mới có thể chọn video.");
            return;
        }

        const videoUrl = `https://colkidclub-hutech.id.vn/video/play/${encodeURIComponent(video.title)}`;
        console.log(`Playing video: ${videoUrl}`);
        setCurrentVideoUrl(videoUrl);
        setShowVideoList(false);

        // Loại bỏ đuôi .mp4 khỏi tiêu đề video
        const videoTitleWithoutExtension = video.title.replace('.mp4', '');

        // Nếu là chủ phòng, gửi trạng thái video đến tất cả người dùng
        if (isOwner) {
            const videoState = {
                videoUrl: videoUrl,
                currentTime: 0, // Bắt đầu từ đầu
                isPlaying: true, // Bắt đầu phát
                type: 'VIDEO_UPDATE'
            };
            console.log('Sending VIDEO_UPDATE:', videoState);
            stompClientRef.current.publish({
                destination: `/app/chat.videoUpdate/${roomId}`,
                body: JSON.stringify(videoState)
            });

            // Gửi thông báo phát video mới trong khung chat
            const notificationMessage = {
                sender: 'Thông Báo', // Bạn có thể chọn một tên người gửi như 'System'
                content: `Chủ phòng đã phát video mới: ${videoTitleWithoutExtension}`, // Sử dụng tiêu đề không có đuôi .mp4
                type: 'CHAT'
            };
            stompClientRef.current.publish({
                destination: `/app/chat.sendMessage/${roomId}`,
                body: JSON.stringify(notificationMessage)
            });
        }
    };



    // Hàm tạm dừng video
    const handlePause = () => {
        if (isOwner && isPlaying) { // Chỉ nếu đang phát và là chủ phòng
            console.log('Pausing video');
            setIsPlaying(false);
            const videoState = {
                videoUrl: currentVideoUrl,
                currentTime: playerRef.current.getCurrentTime(),
                type: 'VIDEO_PAUSE'
            };
            stompClientRef.current.publish({
                destination: `/app/chat.videoUpdate/${roomId}`,
                body: JSON.stringify(videoState)
            });
        }
    };

    // Hàm phát video
    const handlePlay = () => {
        if (isOwner && !isPlaying) { // Chỉ nếu đang tạm dừng và là chủ phòng
            console.log('Playing video');
            setIsPlaying(true);
            const videoState = {
                videoUrl: currentVideoUrl,
                currentTime: playerRef.current.getCurrentTime(),
                isPlaying: true,
                type: 'VIDEO_PLAY'
            };
            stompClientRef.current.publish({
                destination: `/app/chat.videoUpdate/${roomId}`,
                body: JSON.stringify(videoState)
            });
        }
    };

    // Hàm gửi tiến trình video khi tua
    const handleProgress = (state) => {
        if (isOwner && playerRef.current) {
            const currentTime = state.playedSeconds;
            const actualTime = playerRef.current.getCurrentTime();
            if (Math.abs(currentTime - actualTime) > 1) { // Chỉ gửi nếu thay đổi đáng kể
                const videoState = {
                    videoUrl: currentVideoUrl,
                    currentTime: currentTime,
                    type: 'VIDEO_PROGRESS'
                };
                console.log('Sending VIDEO_PROGRESS:', videoState);
                stompClientRef.current.publish({
                    destination: `/app/chat.videoUpdate/${roomId}`,
                    body: JSON.stringify(videoState)
                });
            }
        }
    };

    const handleShowVideoList = () => {
        setShowVideoList(true);
    };

    return (
        <div className="container">
            <Header usersInRoom={usersInRoom} onSearchClick={handleShowVideoList} />

            <div className="main-content">
                <div className="video-section">
                    {showVideoList ? (
                        <div className={`grid-container ${!isOwner ? 'disabled' : ''}`}>
                            {videoList.map((video, index) => (
                                <div
                                    className={`video-card ${!isOwner ? 'disabled-card' : ''}`}
                                    key={index}
                                    onClick={() => playVideo(video)}
                                    style={{ cursor: isOwner ? 'pointer' : 'not-allowed', opacity: isOwner ? 1 : 0.6 }}
                                    title={isOwner ? 'Click to play video' : 'Bạn không có quyền chọn video'}
                                >
                                    <img
                                        src={`https://colkidclub-hutech.id.vn${video.thumbnail}`} // Full URL to thumbnail
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
                        currentVideoUrl ? ( // Chỉ hiển thị ReactPlayer nếu currentVideoUrl không trống
                            <ReactPlayer
                                ref={playerRef} // Attach ref to ReactPlayer
                                url={currentVideoUrl}
                                className="react-player"
                                playing={isPlaying} // Use isPlaying state to control playback
                                controls={isOwner} // Chỉ hiển thị điều khiển nếu là chủ phòng
                                width="100%"
                                height="100%"
                                onPause={handlePause} // Triggered khi video bị tạm dừng
                                onPlay={handlePlay} // Triggered khi video bắt đầu phát
                                onProgress={handleProgress} // Triggered trong quá trình phát video (tua)
                                onEnded={() => setShowVideoList(true)} // Hiển thị danh sách video khi video kết thúc
                            />
                        ) : (
                            <div className="no-video-placeholder">
                                <p>Không có video nào đang phát. Vui lòng chọn một video từ danh sách.</p>
                            </div>
                        )
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
                                                    <em>{message.sender} {message.type === 'JOIN' ? 'đã tham gia phòng' : 'đã rời khỏi phòng'}</em>
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
                                                        <img src={`data:image/png;base64,${message.image}`} alt="Sent" style={{ maxWidth: '200px', marginTop: '10px' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Preview ảnh khi chọn */}
                    {selectedImage && (
                        <div className="image-preview-container">
                            <img src={URL.createObjectURL(selectedImage)} alt="Preview" style={{ maxWidth: '200px', marginBottom: '10px' }} />
                            <button onClick={() => setSelectedImage(null)} style={{ marginLeft: '10px' }}>Remove</button>
                        </div>
                    )}

                    {/* Input chat */}
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

                    {/* Thông báo kết nối */}
                    {!connected && <p className="connection-status">Đang kết nối đến máy chủ chat...</p>}
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;
