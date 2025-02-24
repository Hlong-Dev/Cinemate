import React from 'react';
import ReactPlayer from 'react-player';

const VideoBackgroundEffect = ({ currentVideoUrl, isPlaying }) => {
    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden -z-10">
            {/* Background color overlay for when video is loading */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Video container with blur effects */}
            <div className="absolute inset-0 backdrop-blur-xl">
                {/* Scale the video up slightly to prevent blur edges from showing */}
                <div className="absolute inset-0 scale-110">
                    <ReactPlayer
                        url={currentVideoUrl}
                        playing={isPlaying}
                        loop
                        muted
                        width="100%"
                        height="100%"
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
                                    showinfo: 0
                                }
                            }
                        }}
                    />
                </div>
            </div>

            {/* Additional overlay for depth and contrast */}
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