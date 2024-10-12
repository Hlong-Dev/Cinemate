import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const VideoPlayer = ({ roomId, ownerUsername, currentUser }) => {
    const [playing, setPlaying] = useState(false);
    const [played, setPlayed] = useState(0);
    const playerRef = useRef(null);
    const [stompClient, setStompClient] = useState(null);

    useEffect(() => {
        const socket = new SockJS('https://ddf1-183-91-29-130.ngrok-free.app/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                client.subscribe(`/topic/video/${roomId}`, (message) => {
                    const { action, time } = JSON.parse(message.body);
                    if (currentUser.username !== ownerUsername) {
                        if (action === 'PAUSE') {
                            setPlaying(false);
                        } else if (action === 'PLAY') {
                            setPlaying(true);
                            if (time !== null) {
                                playerRef.current.seekTo(time);
                            }
                        } else if (action === 'SEEK') {
                            playerRef.current.seekTo(time);
                        }
                    }
                });
            },
        });
        client.activate();
        setStompClient(client);

        return () => client.deactivate();
    }, [roomId, currentUser, ownerUsername]);

    const handlePlayPause = () => {
        if (currentUser.username === ownerUsername) {
            const action = playing ? 'PAUSE' : 'PLAY';
            const time = playerRef.current.getCurrentTime();
            stompClient.publish({
                destination: `/app/video.control/${roomId}`,
                body: JSON.stringify({ action, time }),
            });
        }
        setPlaying(!playing);
    };

    const handleSeek = (newPlayed) => {
        setPlayed(newPlayed);
        if (currentUser.username === ownerUsername) {
            stompClient.publish({
                destination: `/app/video.control/${roomId}`,
                body: JSON.stringify({ action: 'SEEK', time: newPlayed }),
            });
        }
    };

    return (
        <div className="video-section">
            <ReactPlayer
                ref={playerRef}
                url="https://ddf1-183-91-29-130.ngrok-free.app/video/play"
                playing={playing}
                controls={true}
                width="100%"
                height="100%"
                onPlay={() => handlePlayPause()}
                onPause={() => handlePlayPause()}
                onSeek={(time) => handleSeek(time)}
                onProgress={({ played }) => setPlayed(played)}
            />
        </div>
    );
};

export default VideoPlayer;
