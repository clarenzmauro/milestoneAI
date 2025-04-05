import React from 'react';
import { Settings, User, LogIn, LogOut } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Logo from './Logo';
import Link from 'next/link';

export default function Header() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  return (
    <header className="w-full bg-white border-b border-accent2 shadow-sm py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Logo className="mr-4" />
          
          <nav className="hidden md:flex ml-6 space-x-6">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-black font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              href="/plans" 
              className="text-gray-700 hover:text-black font-medium transition-colors"
            >
              My Plans
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
          ) : session?.user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-sm text-gray-700">
                {session.user.name}
              </div>
              <div className="flex items-center">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="h-10 w-10 rounded-full border-2 border-accent1"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent1 flex items-center justify-center">
                    <User size={20} className="text-black" />
                  </div>
                )}
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent2 rounded-full p-1"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="flex items-center bg-accent1 hover:bg-accent2 text-black px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-accent2"
            >
              <LogIn size={18} className="mr-2" />
              <span>Sign In</span>
            </button>
          )}
          
          <button 
            className="text-gray-600 hover:text-black focus:outline-none focus:ring-2 focus:ring-accent2 rounded-full p-1"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
} 