// VideoBackgroundEffect.js
import React, { useEffect, useRef, useState } from 'react';

const VideoBackgroundEffect = ({ currentVideoUrl }) => {
    const canvasRef = useRef(null);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);

    useEffect(() => {
        // Lấy video ID từ URL YouTube
        const getVideoId = (url) => {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        };

        const videoId = getVideoId(currentVideoUrl);
        if (videoId) {
            // Lấy thumbnail chất lượng cao nhất
            const maxResThumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            const hqThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

            // Thử load maxres thumbnail trước
            const img = new Image();
            img.onload = () => {
                // Nếu maxres không khả dụng (404), nó sẽ trả về ảnh nhỏ (120x90)
                if (img.naturalHeight <= 90) {
                    setThumbnailUrl(hqThumb);
                } else {
                    setThumbnailUrl(maxResThumb);
                }
            };
            img.onerror = () => {
                setThumbnailUrl(hqThumb);
            };
            img.src = maxResThumb;
        }
    }, [currentVideoUrl]);

    useEffect(() => {
        if (!canvasRef.current || !thumbnailUrl) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let image = new Image();

        const drawEffect = () => {
            try {
                const containerRect = canvas.parentElement.getBoundingClientRect();
                canvas.width = containerRect.width;
                canvas.height = containerRect.height;

                // Vẽ thumbnail với blur
                ctx.filter = 'blur(30px)';
                ctx.globalAlpha = 0.3;

                // Tính toán kích thước để giữ tỷ lệ và phủ đầy canvas
                const imgRatio = image.naturalWidth / image.naturalHeight;
                const canvasRatio = canvas.width / canvas.height;
                let drawWidth, drawHeight, x, y;

                if (canvasRatio > imgRatio) {
                    drawWidth = canvas.width;
                    drawHeight = canvas.width / imgRatio;
                    x = 0;
                    y = (canvas.height - drawHeight) / 2;
                } else {
                    drawHeight = canvas.height;
                    drawWidth = canvas.height * imgRatio;
                    x = (canvas.width - drawWidth) / 2;
                    y = 0;
                }

                ctx.drawImage(image, x, y, drawWidth, drawHeight);

                // Thêm gradient overlay
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Thêm hiệu ứng pulse nhẹ
                const time = Date.now() / 2000;
                const pulse = Math.sin(time) * 0.1 + 0.9;
                ctx.fillStyle = `rgba(0,0,0,${pulse * 0.3})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

            } catch (e) {
                console.error("Error drawing effect:", e);
            }

            animationFrameId = requestAnimationFrame(drawEffect);
        };

        image.onload = () => {
            drawEffect();
        };

        image.src = thumbnailUrl;

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [thumbnailUrl]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                pointerEvents: 'none',
            }}
        />
    );
};

export default VideoBackgroundEffect;