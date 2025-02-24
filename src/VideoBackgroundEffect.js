import React, { useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';

const VideoBackgroundEffect = ({
    currentVideoUrl,
    isPlaying,
    seeking,
    progress,
    onReady
}) => {
    const playerRef = useRef(null);
    const lastSyncTime = useRef(0);
    const syncThreshold = 0.1; // Ngưỡng đồng bộ (giây)

    // Theo dõi và đồng bộ thời gian phát
    useEffect(() => {
        if (playerRef.current && progress) {
            const currentTime = progress.playedSeconds;
            const backgroundTime = playerRef.current.getCurrentTime();

            // Chỉ đồng bộ nếu chênh lệch lớn hơn ngưỡng
            if (Math.abs(currentTime - backgroundTime) > syncThreshold) {
                playerRef.current.seekTo(currentTime, 'seconds');
            }
        }
    }, [progress]);

    // Xử lý khi video sẵn sàng
    const handleReady = () => {
        if (playerRef.current && progress) {
            playerRef.current.seekTo(progress.playedSeconds, 'seconds');
        }
        if (onReady) onReady();
    };

    // Đồng bộ khi seeking
    useEffect(() => {
        if (seeking && playerRef.current && progress) {
            playerRef.current.seekTo(progress.playedSeconds, 'seconds');
        }
    }, [seeking, progress]);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute inset-0 bg-black/50" />

            <div className="absolute inset-0 backdrop-blur-xl">
                <div className="absolute inset-0 scale-110">
                    <ReactPlayer
                        ref={playerRef}
                        url={currentVideoUrl}
                        playing={isPlaying}
                        muted
                        width="100%"
                        height="100%"
                        onReady={handleReady}
                        playbackRate={1}
                        style={{
                            filter: 'blur(30px)',
                            opacity: 0.5,
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            minWidth: '100%',
                            minHeight: '100%',
                            width: 'auto',
                            height: 'auto'
                        }}
                        config={{
                            youtube: {
                                playerVars: {
                                    controls: 0,
                                    disablekb: 1,
                                    fs: 0,
                                    modestbranding: 1,
                                    playsinline: 1,
                                    rel: 0,
                                    showinfo: 0,
                                    origin: window.location.origin,
                                    enablejsapi: 1
                                }
                            }
                        }}
                    />
                </div>
            </div>

            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)',
                    mixBlendMode: 'multiply'
                }}
            />
        </div>
    );
};

export default VideoBackgroundEffect;