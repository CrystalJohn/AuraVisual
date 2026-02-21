import React from 'react';
import { Compass, Image, Settings, User, Clapperboard, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  onToggleGallery: () => void;
  isGalleryOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onToggleGallery, isGalleryOpen }) => {
  const location = useLocation();

  return (
    <div className="fixed left-0 top-0 bottom-0 w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-6 z-50">
      {/* Logo Placeholder */}
      <div className="w-10 h-10 bg-indigo-600 rounded-xl mb-8 flex items-center justify-center shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]">
        <span className="font-bold text-white text-xl">A</span>
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-6 flex-1 w-full items-center">
        <Link to="/">
          <NavItem 
            icon={User} 
            label="AI Influencer" 
            active={location.pathname === '/'} 
          />
        </Link>
        <Link to="/pixar">
          <NavItem 
            icon={Clapperboard} 
            label="Pixar Studio" 
            active={location.pathname === '/pixar'} 
          />
        </Link>
        <Link to="/storyboard">
          <NavItem 
            icon={BookOpen} 
            label="Storyboard" 
            active={location.pathname === '/storyboard'} 
          />
        </Link>
        
        <div className="h-px w-8 bg-zinc-800 my-2" />
        
        <NavItem 
            icon={Image} 
            label="History" 
            active={isGalleryOpen} 
            onClick={onToggleGallery} 
        />
        <NavItem icon={Compass} label="Explore" />
        <NavItem icon={Settings} label="Settings" />
      </div>

      {/* User */}
      <div className="mt-auto">
         <button className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-400 hover:text-white">
            <User size={20} />
         </button>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: any, label: string, active?: boolean, onClick?: () => void }> = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all
    ${active ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
    title={label}
  >
    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    {active && <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-400 rounded-r-full" />}
  </button>
);

