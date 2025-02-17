// ChatRoom.js
import React, { useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs'; // Không cần SockJS
import { useNavigate, useParams } from 'react-router-dom';
import './ChatRoom.css';
import { getUserFromToken } from './utils/jwtUtils';
import Compressor from 'compressorjs';
import Header from './components/Header';
import ReactPlayer from 'react-player';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios'; // Thêm axios để gọi API
import VideoQueue from './components/VideoQueue';  // Điều chỉnh đường dẫn tùy theo cấu trúc thư mục của bạn
const ChatRoom = () => {
    // Lấy roomId từ URL
    const { roomId } = useParams();
    //
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [videoQueue, setVideoQueue] = useState([]);
    const handleQueueClick = () => {
        setShowQueueModal(prev => !prev); // Toggle modal thay vì chỉ mở
    };
    useEffect(() => {
        // Load queue từ localStorage khi khởi tạo
        const savedQueue = localStorage.getItem(`videoQueue_${roomId}`);
        if (savedQueue) {
            try {
                const parsedQueue = JSON.parse(savedQueue);
                setVideoQueue(parsedQueue);
            } catch (error) {
                console.error('Error parsing saved queue:', error);
            }
        }
    }, [roomId]);
    const addToQueue = (video, isYouTube = false) => {
        

        const currentUser = getUserFromToken();

        // Prepare the new queue item
        const newQueueItem = {
            id: isYouTube ? video.id.videoId : video.title,
            title: isYouTube ? video.snippet.title : video.title,
            thumbnail: isYouTube ? video.snippet.thumbnails.medium.url : `https://colkidclub-hutech.id.vn${video.thumbnail}`,
            url: isYouTube ? `https://www.youtube.com/watch?v=${video.id.videoId}`
                : `https://colkidclub-hutech.id.vn/video/play/${encodeURIComponent(video.title)}`,
            duration: video.duration,
            allowUserQueue: true,
            votes: 1,
            voters: [{
                username: currentUser.username,
                avtUrl: currentUser.avtUrl
            }]
        };

        // Nếu không có video đang phát, phát video ngay lập tức
        if (!currentVideoUrl && isOwner) {
            setCurrentVideoUrl(newQueueItem.url);
            setShowVideoList(false);
            setIsPlaying(true);

            // Broadcast video state
            if (stompClientRef.current && stompClientRef.current.connected) {
                const videoState = {
                    videoUrl: newQueueItem.url,
                    currentTime: 0,
                    isPlaying: true,
                    type: 'VIDEO_UPDATE'
                };
                stompClientRef.current.publish({
                    destination: `/app/chat.videoUpdate/${roomId}`,
                    body: JSON.stringify(videoState)
                });

                // Send chat notification
                const notificationMessage = {
                    sender: 'Thông Báo',
                    content: `Chủ phòng đã phát video mới: ${newQueueItem.title}`,
                    type: 'CHAT'
                };
                stompClientRef.current.publish({
                    destination: `/app/chat.sendMessage/${roomId}`,
                    body: JSON.stringify(notificationMessage)
                });
            }
            return;
        }

        // Tạo một bản sao của queue để thao tác
        let updatedQueue = [...videoQueue];

        // Tìm và xóa vote của user ở các video khác
        updatedQueue = updatedQueue.map(queueItem => {
            // Nếu video này có vote của user
            if (queueItem.voters && queueItem.voters.some(voter => voter.username === currentUser.username)) {
                // Giảm vote và loại bỏ user khỏi danh sách voters
                return {
                    ...queueItem,
                    votes: Math.max((queueItem.votes || 1) - 1, 0),
                    voters: queueItem.voters.filter(voter => voter.username !== currentUser.username)
                };
            }
            return queueItem;
        });

        // Kiểm tra xem video mới đã tồn tại trong queue chưa
        const existingVideoIndex = updatedQueue.findIndex(
            queueItem => queueItem.id === newQueueItem.id
        );

        if (existingVideoIndex !== -1) {
            // Nếu video đã tồn tại, cập nhật vote
            const existingVideo = updatedQueue[existingVideoIndex];
            existingVideo.votes += 1;
            existingVideo.voters.push({
                username: currentUser.username,
                avtUrl: currentUser.avtUrl
            });
        } else {
            // Nếu video chưa tồn tại, thêm mới vào queue
            updatedQueue.push(newQueueItem);
        }

        // Sắp xếp lại queue theo số vote
        updatedQueue.sort((a, b) => (b.votes || 0) - (a.votes || 0));

        // Cập nhật state và localStorage
        setVideoQueue(updatedQueue);
        localStorage.setItem(`videoQueue_${roomId}`, JSON.stringify(updatedQueue));

        // Gửi thông báo
        setSuccessMessage(`Đã thêm "${newQueueItem.title}" vào hàng chờ`);
        setShowSuccessModal(true);
        setTimeout(() => {
            setShowSuccessModal(false);
        }, 2000);

        // Gửi thông báo vote trong chat
        if (stompClientRef.current && stompClientRef.current.connected) {
            const notificationMessage = {
                sender: 'Thông Báo',
                content: `${currentUser.username} đã vote cho video "${newQueueItem.title}"`,
                type: 'CHAT'
            };
            stompClientRef.current.publish({
                destination: `/app/chat.sendMessage/${roomId}`,
                body: JSON.stringify(notificationMessage)
            });
        }

        // Broadcast queue update
        broadcastQueueUpdate(updatedQueue);
    };

    // Cập nhật hàm handleVoteVideo
    const handleVoteVideo = (index) => {
        const currentUser = getUserFromToken();
        const updatedQueue = [...videoQueue];
        const targetVideo = updatedQueue[index];

        // Đảm bảo rằng voters được khởi tạo cho tất cả video trong queue
        updatedQueue.forEach(video => {
            if (!video.voters) {
                video.voters = [];
            }
        });

        // Kiểm tra xem user đã vote cho video khác chưa
        const userPreviousVote = updatedQueue.findIndex(video =>
            video.voters && video.voters.some(voter => voter.username === currentUser.username)
        );

        // Nếu user đã vote cho video khác, hủy vote cũ
        if (userPreviousVote !== -1 && userPreviousVote !== index) {
            updatedQueue[userPreviousVote].votes = (updatedQueue[userPreviousVote].votes || 1) - 1;
            updatedQueue[userPreviousVote].voters = updatedQueue[userPreviousVote].voters.filter(
                voter => voter.username !== currentUser.username
            );
        }

        // Đảm bảo rằng video hiện tại có mảng voters
        if (!targetVideo.voters) {
            targetVideo.voters = [];
        }

        // Kiểm tra xem user đã vote cho video này chưa
        const hasVoted = targetVideo.voters.some(voter => voter.username === currentUser.username);

        if (!hasVoted) {
            // Thêm vote mới
            targetVideo.votes = (targetVideo.votes || 0) + 1;
            targetVideo.voters.push({
                username: currentUser.username,
                avtUrl: currentUser.avtUrl
            });

            // Gửi thông báo trong chat
            if (stompClientRef.current && stompClientRef.current.connected) {
                const notificationMessage = {
                    sender: 'Thông Báo',
                    content: `${currentUser.username} đã vote cho video "${targetVideo.title}"`,
                    type: 'CHAT'
                };
                stompClientRef.current.publish({
                    destination: `/app/chat.sendMessage/${roomId}`,
                    body: JSON.stringify(notificationMessage)
                });
            }
        }

        // Sắp xếp lại queue theo số vote
        updatedQueue.sort((a, b) => (b.votes || 0) - (a.votes || 0));

        setVideoQueue(updatedQueue);
        localStorage.setItem(`videoQueue_${roomId}`, JSON.stringify(updatedQueue));
        broadcastQueueUpdate(updatedQueue);
    };

    // Hàm gửi cập nhật queue qua WebSocket
    const broadcastQueueUpdate = (updatedQueue) => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            const queueUpdate = {
                type: 'QUEUE_UPDATE',
                queue: updatedQueue,
                roomId: roomId
            };
            stompClientRef.current.publish({
                destination: `/topic/${roomId}`,
                body: JSON.stringify(queueUpdate)
            });
        }
    };

    // Sửa lại hàm removeFromQueue
    const removeFromQueue = (index) => {
        if (!isOwner) {
            alert("Only the room owner can remove videos from the queue.");
            return;
        }

        const updatedQueue = videoQueue.filter((_, i) => i !== index);
        setVideoQueue(updatedQueue);

        // Lưu vào localStorage
        localStorage.setItem(`videoQueue_${roomId}`, JSON.stringify(updatedQueue));

        // Broadcast queue update
        if (stompClientRef.current && stompClientRef.current.connected) {
            const queueUpdate = {
                type: 'QUEUE_UPDATE',
                queue: updatedQueue,
                roomId: roomId
            };
            stompClientRef.current.publish({
                destination: `/app/chat.queueUpdate/${roomId}`,
                body: JSON.stringify(queueUpdate)
            });
        }
    };

    // Modify the onEnded handler in ReactPlayer
    const handleVideoEnd = () => {
        if (videoQueue.length > 0 && isOwner) {
            const nextVideo = videoQueue[0];
            const updatedQueue = videoQueue.slice(1);

            // Update queue
            setVideoQueue(updatedQueue);
            localStorage.setItem(`videoQueue_${roomId}`, JSON.stringify(updatedQueue));

            // Play next video immediately
            setCurrentVideoUrl(nextVideo.url);
            setIsPlaying(true);
            setShowVideoList(false);

            // Broadcast updates
            if (stompClientRef.current && stompClientRef.current.connected) {
                // Queue update
                const queueUpdate = {
                    type: 'QUEUE_UPDATE',
                    queue: updatedQueue,
                    roomId: roomId
                };
                stompClientRef.current.publish({
                    destination: `/app/chat.queueUpdate/${roomId}`,
                    body: JSON.stringify(queueUpdate)
                });

                // Video state update
                const videoState = {
                    videoUrl: nextVideo.url,
                    currentTime: 0,
                    isPlaying: true,
                    type: 'VIDEO_UPDATE'
                };
                stompClientRef.current.publish({
                    destination: `/app/chat.videoUpdate/${roomId}`,
                    body: JSON.stringify(videoState)
                });

                // Notification message
                const notificationMessage = {
                    sender: 'Thông Báo',
                    content: `Đang phát video tiếp theo: ${nextVideo.title}`,
                    type: 'CHAT'
                };
                stompClientRef.current.publish({
                    destination: `/app/chat.sendMessage/${roomId}`,
                    body: JSON.stringify(notificationMessage)
                });
            }
        } else {
            // No videos in queue, show video list
            setShowVideoList(true);
        }
    };

    // Các trạng thái quản lý video
    const [isPlaying, setIsPlaying] = useState(true); // Trạng thái phát/tạm dừng video
    const [videoList, setVideoList] = useState([]); // Danh sách video
    const [currentVideoUrl, setCurrentVideoUrl] = useState(''); // URL video hiện tại
    const [showVideoList, setShowVideoList] = useState(true); // Hiển thị danh sách video

    const [searchTerm, setSearchTerm] = useState(''); // Từ khóa tìm kiếm
    const [youtubeResults, setYoutubeResults] = useState([]); // Kết quả tìm kiếm YouTube
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
    const API_KEY = 'AIzaSyCi1QkAQ8IXkQKme9yl34BB0WPCcSg8_MQ';
    const [isWebSocketReady, setIsWebSocketReady] = useState(false);
    // Refs cho currentVideoUrl và isPlaying
    const currentVideoUrlRef = useRef(currentVideoUrl);
    const isPlayingRef = useRef(isPlaying);
    const [isLoading, setIsLoading] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState(0);
    const [syncInterval, setSyncInterval] = useState(null);
    const isOwner = currentUser.username === ownerUsername;
    const [searchParams] = useSearchParams();
    const urlVideoId = searchParams.get('videoId');
    const autoplay = searchParams.get('autoplay') === 'true';
    // Hàm search Video
    const searchYoutubeVideos = async () => {
        try {
            if (!searchTerm.trim()) {
                setYoutubeResults([]);
                setIsLoading(false);
                setImagesLoaded(0);
                return;
            }

            setIsLoading(true);
            setImagesLoaded(0);
            const response = await axios.get(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchTerm}&type=video&key=${API_KEY}&maxResults=10`
            );
            setYoutubeResults(response.data.items);
        } catch (error) {
            console.error('Error fetching YouTube results:', error);
            setIsLoading(false);
            setImagesLoaded(0);
        }
    };

    // Hàm phát video YouTube
    const playYoutubeVideo = (videoId, videoTitle) => {
        if (!isOwner) {
            alert("Chỉ chủ phòng mới có thể chọn video.");
            return;
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // If no video is currently playing, play immediately
        if (!currentVideoUrl) {
            setCurrentVideoUrl(videoUrl);
            setShowVideoList(false);
            setIsPlaying(true);
            setYoutubeResults([]);
        } else {
            // Add to queue (this will handle duplicate logic)
            const youtubeVideo = youtubeResults.find(v => v.id.videoId === videoId);
            if (youtubeVideo) {
                addToQueue(youtubeVideo, true);
            }
            return;
        }

        // Broadcast video state
        if (stompClientRef.current && stompClientRef.current.connected) {
            const videoState = {
                videoUrl: videoUrl,
                currentTime: 0,
                isPlaying: true,
                type: 'VIDEO_UPDATE'
            };
            stompClientRef.current.publish({
                destination: `/app/chat.videoUpdate/${roomId}`,
                body: JSON.stringify(videoState)
            });

            // Send chat notification
            const notificationMessage = {
                sender: 'Thông Báo',
                content: `Chủ phòng đã phát video YouTube: ${videoTitle}`,
                type: 'CHAT'
            };
            stompClientRef.current.publish({
                destination: `/app/chat.sendMessage/${roomId}`,
                body: JSON.stringify(notificationMessage)
            });
        }
    };

    // Tách logic xử lý video params ra một useEffect riêng
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm) {
                searchYoutubeVideos();
            } else {
                setYoutubeResults([]);
                setIsLoading(false);
                setImagesLoaded(0);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);
    // Ảuto play video from Params
    useEffect(() => {
        const initializeVideoFromUrl = async () => {
            if (urlVideoId && isWebSocketReady && stompClientRef.current?.connected) {
                try {
                    // Fetch video details from YouTube API
                    const videoDetailsResponse = await axios.get(
                        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${urlVideoId}&key=${API_KEY}`
                    );

                    const videoTitle = videoDetailsResponse.data.items[0]?.snippet.title || 'Unknown Video';
                    const videoUrl = `https://www.youtube.com/watch?v=${urlVideoId}`;

                    // Set video state
                    setCurrentVideoUrl(videoUrl);
                    setShowVideoList(false);
                    setIsPlaying(autoplay);

                    // If user is room owner, broadcast video state to all users
                    if (isOwner) {
                        const videoState = {
                            videoUrl: videoUrl,
                            currentTime: 0,
                            isPlaying: autoplay,
                            type: 'VIDEO_UPDATE'
                        };

                        stompClientRef.current.publish({
                            destination: `/app/chat.videoUpdate/${roomId}`,
                            body: JSON.stringify(videoState)
                        });

                        // Send chat notification with video title
                        const notificationMessage = {
                            sender: 'Thông Báo',
                            content: `Chủ phòng đã phát video YouTube: ${videoTitle}`,
                            type: 'CHAT'
                        };

                        stompClientRef.current.publish({
                            destination: `/app/chat.sendMessage/${roomId}`,
                            body: JSON.stringify(notificationMessage)
                        });
                    }
                } catch (error) {
                    console.error('Error fetching video details:', error);
                    // Still play the video even if we can't get the title
                    const videoUrl = `https://www.youtube.com/watch?v=${urlVideoId}`;
                    setCurrentVideoUrl(videoUrl);
                    setShowVideoList(false);
                    setIsPlaying(autoplay);
                }
            }
        };

        initializeVideoFromUrl();
    }, [urlVideoId, autoplay, isWebSocketReady, isOwner, roomId]);
    // Thêm useEffect để theo dõi việc load ảnh
    useEffect(() => {
        if (youtubeResults.length > 0) {
            setImagesLoaded(0);

            const imageLoaders = youtubeResults.map((video) => {
                const img = new Image();
                img.src = video.snippet.thumbnails.medium.url;
                img.onload = () => {
                    setImagesLoaded((prev) => prev + 1);
                };
                img.onerror = () => {
                    setImagesLoaded((prev) => prev + 1);
                };
                return img;
            });

            return () => {
                imageLoaders.forEach(img => {
                    img.onload = null;
                    img.onerror = null;
                });
            };
        }
    }, [youtubeResults]);
    // Thêm gửi trạng thái video state
    useEffect(() => {
        // Hàm gửi trạng thái video
        const sendVideoState = () => {
            // Chỉ gửi trạng thái nếu video đang phát và không đang trong chế độ tìm kiếm
            if (isOwner && playerRef.current && currentVideoUrl && !showVideoList) {
                const videoState = {
                    videoUrl: currentVideoUrl,
                    currentTime: playerRef.current.getCurrentTime(),
                    isPlaying: isPlaying,
                    type: 'VIDEO_UPDATE'
                };

                if (stompClientRef.current && stompClientRef.current.connected) {
                    stompClientRef.current.publish({
                        destination: `/app/chat.videoUpdate/${roomId}`,
                        body: JSON.stringify(videoState)
                    });
                }
            }
        };

        // Chỉ thiết lập interval khi:
        // 1. Là chủ phòng
        // 2. Có video đang phát
        // 3. Không đang trong chế độ tìm kiếm
        if (isOwner && currentVideoUrl && !showVideoList) {
            // Clear interval cũ nếu có
            if (syncInterval) {
                clearInterval(syncInterval);
            }

            // Tạo interval mới để gửi trạng thái mỗi 5 giây
            const interval = setInterval(sendVideoState, 5000);
            setSyncInterval(interval);
        } else if (syncInterval) {
            // Nếu không thỏa mãn điều kiện và có interval, clear nó
            clearInterval(syncInterval);
            setSyncInterval(null);
        }

        // Cleanup function
        return () => {
            if (syncInterval) {
                clearInterval(syncInterval);
            }
        };
    }, [isOwner, currentVideoUrl, isPlaying, roomId, showVideoList]);

    // Cập nhật refs khi state thay đổi
    useEffect(() => {
        currentVideoUrlRef.current = currentVideoUrl;
    }, [currentVideoUrl]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Xác định xem người dùng hiện tại có phải là chủ phòng hay không
  

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
                    setIsWebSocketReady(true); // Đánh dấu WebSocket đã sẵn sàng

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
                                setMessages(prevMessages => [...prevMessages, receivedMessage]);

                                // Nếu là chủ phòng, gửi ngay trạng thái hiện tại
                                if (currentUser.username === ownerUsernameRef.current) {
                                    console.log('Owner sending current state to new user');

                                    // Lấy queue từ localStorage của chủ phòng
                                    const savedQueue = localStorage.getItem(`videoQueue_${roomId}`);
                                    let queueToSend = [];

                                    if (savedQueue) {
                                        try {
                                            queueToSend = JSON.parse(savedQueue);
                                            console.log('Sending saved queue to new user:', queueToSend);
                                        } catch (error) {
                                            console.error('Error parsing saved queue:', error);
                                        }
                                    }

                                    setTimeout(() => {
                                        // Gửi queue hiện tại cho người dùng mới
                                        if (queueToSend.length > 0 || videoQueue.length > 0) {
                                            const queueUpdate = {
                                                type: 'QUEUE_UPDATE',
                                                queue: queueToSend.length > 0 ? queueToSend : videoQueue,
                                                roomId: roomId
                                            };
                                            console.log('Sending queue update to new user:', queueUpdate);
                                            stompClientRef.current.publish({
                                                destination: `/topic/${roomId}`,
                                                body: JSON.stringify(queueUpdate)
                                            });
                                        }

                                        // Gửi trạng thái video nếu có
                                        if (playerRef.current && currentVideoUrlRef.current) {
                                            const videoState = {
                                                videoUrl: currentVideoUrlRef.current,
                                                currentTime: playerRef.current.getCurrentTime(),
                                                isPlaying: isPlayingRef.current,
                                                type: 'VIDEO_UPDATE'
                                            };
                                            stompClientRef.current.publish({
                                                destination: `/topic/${roomId}`,
                                                body: JSON.stringify(videoState)
                                            });
                                        }
                                    }, 1000);
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
                            case 'QUEUE_UPDATE':
                                console.log('Received QUEUE_UPDATE:', receivedMessage);
                                console.log('Current roomId:', roomId);
                                console.log('Message roomId:', receivedMessage.roomId);
                                if (receivedMessage.roomId === roomId) {
                                    console.log('Updating queue with:', receivedMessage.queue);
                                    setVideoQueue(receivedMessage.queue);
                                    localStorage.setItem(`videoQueue_${roomId}`, JSON.stringify(receivedMessage.queue));
                                } else {
                                    console.log('RoomId mismatch, not updating queue');
                                }
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

        if (message.videoUrl && !isOwner) {  // Chỉ người xem mới cập nhật
            setCurrentVideoUrl(message.videoUrl);
            setShowVideoList(false);

            if (message.isPlaying !== undefined) {
                setIsPlaying(message.isPlaying);
            }

            if (message.currentTime !== undefined && playerRef.current) {
                const currentPlayerTime = playerRef.current.getCurrentTime();
                // Chỉ tua video nếu chênh lệch thời gian > 2 giây
                if (Math.abs(currentPlayerTime - message.currentTime) > 2) {
                    playerRef.current.seekTo(message.currentTime, 'seconds');
                }
            }
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
        const videoTitleWithoutExtension = video.title.replace('.mp4', '');

        // If no video is currently playing, play immediately
        if (!currentVideoUrl) {
            setCurrentVideoUrl(videoUrl);
            setShowVideoList(false);
            setIsPlaying(true);
        } else {
            // Add to queue (this will handle duplicate logic)
            addToQueue(video);
            return;
        }

        // Broadcast video state if owner
        if (isOwner) {
            const videoState = {
                videoUrl: videoUrl,
                currentTime: 0,
                isPlaying: true,
                type: 'VIDEO_UPDATE'
            };
            stompClientRef.current.publish({
                destination: `/app/chat.videoUpdate/${roomId}`,
                body: JSON.stringify(videoState)
            });

            // Send chat notification
            const notificationMessage = {
                sender: 'Thông Báo',
                content: `Chủ phòng đã phát video mới: ${videoTitleWithoutExtension}`,
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
    // Hàm show lisr video
    const handleShowVideoList = () => {
        setShowVideoList(prev => !prev); // Toggle showVideoList
    };
    // Tr
    return (
        <div className="container">
            <Header
                usersInRoom={usersInRoom}
                onSearchClick={handleShowVideoList}
                onQueueClick={handleQueueClick}  // Thêm dòng này
            />

            <div className="main-content">
                <div className={`video-section ${showVideoList ? 'with-list' : ''}`}>
                    {/* Hiển thị thanh tìm kiếm nếu showVideoList là true */}
                    {showVideoList && (
                        <>
                            <div className="search-bar">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Tìm kiếm video trên YouTube"
                                />
                            </div>

                            {isLoading && (
                                <div className="loading-bar-container">
                                    <div className="loading-bar"></div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Luôn hiển thị video player nếu có currentVideoUrl */}
                    {currentVideoUrl && (
                        <ReactPlayer
                            ref={playerRef}
                            url={currentVideoUrl}
                            className={`react-player ${isOwner ? 'owner' : ''}`}
                            playing={isPlaying}
                            width="100%"
                            height="100%"
                            onPause={handlePause}
                            onPlay={handlePlay}
                            onProgress={handleProgress}
                            onEnded={handleVideoEnd}  // Updated to use new handler
                            config={{
                                youtube: {
                                    playerVars: {
                                        controls: isOwner ? 1 : 0,
                                        disablekb: 1,
                                        modestbranding: 1,
                                        playsinline: 1,
                                        rel: 0,
                                        showinfo: 0,
                                        iv_load_policy: 3,
                                        fs: isOwner ? 1 : 0,
                                    }
                                }
                            }}
                            style={{ pointerEvents: isOwner ? 'auto' : 'none' }}
                        />
                    )}

                    {/* Hiển thị danh sách video tìm kiếm nếu showVideoList là true */}
                    {showVideoList && (
                        <div className="grid-container">
                            {youtubeResults.length > 0 && (
                                <>
                                    {youtubeResults.map((video) => (
                                        <div
                                            key={video.id.videoId}
                                            className="video-card"
                                            onClick={() => addToQueue(video, true)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <img
                                                src={video.snippet.thumbnails.default.url}
                                                alt={video.snippet.title}
                                                className="thumbnail"
                                            />
                                            <div className="video-info">
                                                <p className="video-title">{video.snippet.title}</p>
                                                <span className="video-duration">Add to Queue</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {videoList.map((video, index) => (
                                <div
                                    className={`video-card ${!isOwner ? 'disabled-card' : ''}`}
                                    key={index}
                                    onClick={() => playVideo(video)}
                                    style={{ cursor: isOwner ? 'pointer' : 'not-allowed', opacity: isOwner ? 1 : 0.6 }}
                                    title={isOwner ? 'Click to play video' : 'Bạn không có quyền chọn video'}
                                >
                                    <img
                                        src={`https://colkidclub-hutech.id.vn${video.thumbnail}`}
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
                    )}
                </div>
                {showSuccessModal && (
                    <div className="success-modal">
                        <p>{successMessage}</p>
                    </div>
                )}
                <VideoQueue
                    isOpen={showQueueModal}
                    onClose={() => setShowQueueModal(false)}
                    videoQueue={videoQueue}
                    onRemoveFromQueue={removeFromQueue}
                    onVote={handleVoteVideo}
                    isOwner={isOwner}
                    currentUser={currentUser}  // Thêm dòng này
                />
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
