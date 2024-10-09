// src/utils/jwtUtils.js
export const getUserFromToken = () => {
    const token = localStorage.getItem('token'); // Lấy JWT từ localStorage
    if (!token) return null;

    // Giải mã payload của JWT
    const payload = token.split('.')[1];  // Lấy phần payload (giữa dấu .)
    const decodedPayload = atob(payload); // Giải mã base64
    const user = JSON.parse(decodedPayload);

    return {
        username: user.sub, // Lấy username từ "sub"
        avtUrl: user.avt_url, // Lấy avatar URL từ "avt_url"
        iat: user.iat,
        exp: user.exp
    };
};