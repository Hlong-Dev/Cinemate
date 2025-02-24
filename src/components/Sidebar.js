import React, { useEffect, useRef } from 'react';
import { Settings, Users, User, Network, LogOut, Globe, ShoppingBag } from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
    const sidebarRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <>
            {/* Overlay khi sidebar mở */}
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
            )}

            {/* Sidebar */}
            <nav
                ref={sidebarRef}
                className={`fixed left-0 top-0 h-full w-64 bg-[#1a1a1a] transform transition-transform duration-300 ease-in-out z-50 -translate-x-full ${isOpen ? 'translate-x-0' : ''
                    }`}
            >
                <div className="flex flex-col h-full text-white">
                    <div className="p-4 border-b border-gray-700">
                        <button onClick={onClose} className="text-white">
                            <div className="w-6 h-6">
                                <div className="h-0.5 w-6 bg-white mb-1.5"></div>
                                <div className="h-0.5 w-6 bg-white mb-1.5"></div>
                                <div className="h-0.5 w-6 bg-white"></div>
                            </div>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="py-2 border-b border-gray-700">
                            <a href="#raves" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <Globe className="w-6 h-6 mr-3" />
                                <span>Raves</span>
                            </a>
                            <a href="#friends" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <Users className="w-6 h-6 mr-3" />
                                <span>Friends</span>
                            </a>
                            <a href="#account" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <User className="w-6 h-6 mr-3" />
                                <span>My Account</span>
                            </a>
                            <a href="#connections" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <Network className="w-6 h-6 mr-3" />
                                <span>Connections</span>
                            </a>
                            <a href="#settings" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <Settings className="w-6 h-6 mr-3" />
                                <span>App Settings</span>
                            </a>
                        </div>

                        <div className="py-2 border-b border-gray-700">
                            <button className="w-full flex items-center px-4 py-3 hover:bg-gray-800">
                                <LogOut className="w-6 h-6 mr-3" />
                                <span>Log Out</span>
                            </button>
                        </div>

                        <div className="py-2 border-b border-gray-700">
                            <a href="https://rave.io" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <span className="text-lg font-semibold">rave.io</span>
                            </a>
                            <a href="#instagram" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <span>@getraveapp</span>
                            </a>
                            <a href="#twitter" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <span>@raveapp</span>
                            </a>
                            <a href="#facebook" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <span>@Getrave</span>
                            </a>
                            <a href="#tiktok" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <span>@raveapp</span>
                            </a>
                            <a href="#shop" className="flex items-center px-4 py-3 hover:bg-gray-800">
                                <ShoppingBag className="w-6 h-6 mr-3" />
                                <span>Shop</span>
                            </a>
                        </div>

                        <div className="p-4 text-gray-400 text-sm">
                            <div>v. 1.15.25</div>
                            <div>Windows 64-Bit</div>
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;