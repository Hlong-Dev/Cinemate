import React from 'react';
import { getUserFromToken } from '../utils/jwtUtils';  // Thêm import này
import '../VideoEndScreen.css';
const VideoEndScreen = ({ videoQueue = [], onVote, containerHeight }) => {
    const currentUser = getUserFromToken() || { username: 'Unknown' };

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
            <div className="end-screen-grid">
                {videoQueue.map((video, index) => {
                    const hasVoted = video.voters && video.voters.some(
                        voter => voter.username === currentUser.username
                    );

                    return (
                        <div
                            key={video?.id || index}
                            className={`end-screen-card ${hasVoted ? 'voted' : ''}`}
                            onClick={() => {
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
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VideoEndScreen;