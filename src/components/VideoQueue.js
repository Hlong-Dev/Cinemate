// VideoQueue.js
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import '../VideoQueue.css';

const VideoQueue = ({ isOpen, onClose, videoQueue, onRemoveFromQueue, onVote, isOwner, currentUser }) => {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const hasUserVoted = (video) => {
        return video.voters?.some(voter => voter.username === currentUser.username);
    };

    if (!isOpen) return null;

    return (
        <div
            className={`video-queue-overlay ${isClosing ? 'closing' : ''}`}
            onClick={handleOverlayClick}
        >
            <div className="video-queue-modal">
                <div className="video-queue-content">
                    {videoQueue.length === 0 ? (
                        <p>Chưa có video trong danh sách chờ</p>
                    ) : (
                        <ul className="queue-list">
                            {videoQueue.map((video, index) => (
                                <li
                                    key={index}
                                    className={`queue-item ${hasUserVoted(video) ? 'voted' : ''}`}
                                    onClick={() => !hasUserVoted(video) && onVote(index)}
                                    style={{ cursor: hasUserVoted(video) ? 'default' : 'pointer' }}
                                >
                                    <div className="queue-item-content">
                                        <span className="queue-number">{index + 1}</span>
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            className="queue-thumbnail"
                                        />
                                        <div className="queue-info">
                                            <p className="queue-title">{video.title}</p>
                                            <div className="vote-section">
                                                <div className="voters-avatars">
                                                    {video.voters?.map((voter, voterIndex) => (
                                                        <div
                                                            key={voterIndex}
                                                            className="voter-avatar"
                                                            title={voter.username}
                                                        >
                                                            <img
                                                                src={voter.avtUrl}
                                                                alt={voter.username}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                               
                                            </div>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveFromQueue(index);
                                            }}
                                            className="remove-from-queue"
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoQueue;