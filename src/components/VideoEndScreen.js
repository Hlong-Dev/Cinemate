import React, { useState, useEffect } from 'react';
import '../VideoEndScreen.css';
import { getUserFromToken } from '../utils/jwtUtils'; // Đảm bảo import đúng đường dẫn

const VideoEndScreen = ({ videoQueue = [], onVideoSelect, onVote, containerHeight }) => {
    const [countdown, setCountdown] = useState(10);
    const [isActive, setIsActive] = useState(true);
    const currentUser = getUserFromToken() || { username: 'Unknown' };

    useEffect(() => {
        let timer;
        if (isActive && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (countdown === 0 && videoQueue.length > 0) {
            // Sắp xếp queue theo số vote giảm dần
            const sortedQueue = [...videoQueue].sort((a, b) => {
                // Ưu tiên số vote
                if ((b.votes || 0) !== (a.votes || 0)) {
                    return (b.votes || 0) - (a.votes || 0);
                }

                // Nếu số vote bằng nhau, ưu tiên video đầu tiên trong danh sách
                return -1;
            });

            // Chọn video có nhiều vote nhất
            const mostVotedVideo = sortedQueue.find(video => (video.votes || 0) > 0);

            // Chọn video sau khi sắp xếp
            if (mostVotedVideo) {
                onVideoSelect(mostVotedVideo);
            }
        }

        return () => clearInterval(timer);
    }, [countdown, isActive, videoQueue, onVideoSelect]);

    if (!Array.isArray(videoQueue) || videoQueue.length === 0) {
        return (
            <div className="end-screen-empty">
                <div>
                    <h2 className="end-screen-empty-title">No Videos in Queue</h2>
                    <p className="end-screen-empty-text">Add some videos to continue watching</p>
                </div>
            </div>
        );
    }

    return (
        <div className="end-screen-container">
            {/* Header */}
            <div className="end-screen-header">
                <h2 className="end-screen-title">Up Next</h2>
                <div className="end-screen-countdown">
                    <svg className="end-screen-countdown-circle" viewBox="0 0 36 36">
                        <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke="#333"
                            strokeWidth="2"
                        />
                        <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke="#2196f3"
                            strokeWidth="2"
                            strokeDasharray={100}
                            strokeDashoffset={100 - ((10 - countdown) / 10) * 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <span className="end-screen-countdown-text">
                        {countdown}
                    </span>
                </div>
            </div>

            {/* Video Grid */}
            <div className="end-screen-grid">
                {videoQueue.map((video, index) => {
                    // Kiểm tra xem user đã vote cho video này chưa
                    const hasVoted = video.voters && video.voters.some(voter => voter.username === currentUser.username);

                    return (
                        <div
                            key={video?.id || index}
                            className={`end-screen-card ${hasVoted ? 'voted' : ''}`}
                            onClick={() => {
                                // Nếu chưa vote thì cho vote
                                if (!hasVoted) {
                                    onVote(index);
                                }
                            }}
                            style={{ cursor: hasVoted ? 'default' : 'pointer' }}
                        >
                            <div className="end-screen-thumbnail-container">
                                {video?.thumbnail && (
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title || 'Video thumbnail'}
                                        className="end-screen-thumbnail"
                                    />
                                )}
                                {/* Voters overlay */}
                                {video?.voters && video.voters.length > 0 && (
                                    <div className="end-screen-voters">
                                        {video.voters.slice(0, 3).map((voter, i) => (
                                            <img
                                                key={i}
                                                src={voter?.avtUrl || 'https://i.imgur.com/WxNkK7J.png'}
                                                alt={voter?.username || 'User'}
                                                className="end-screen-voter-avatar"
                                                title={voter?.username}
                                            />
                                        ))}
                                        {video.voters.length > 3 && (
                                            <div className="end-screen-voter-count">
                                                +{video.voters.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="end-screen-info">
                                <h3 className="end-screen-video-title">
                                    {video?.title || 'Untitled Video'}
                                </h3>
                                <div className="end-screen-vote-section">
                                    <div className="end-screen-vote-count">
                                        {video.votes || 0} votes
                                    </div>
                                    {hasVoted && (
                                        <span className="end-screen-voted-text">Voted</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VideoEndScreen;