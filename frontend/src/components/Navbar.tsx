import { useState } from 'react';
import { Search, Film, Menu, X, User, UserCircle, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoginModal } from './LoginModal';
import { getAvatarUrl } from '@/lib/utils';

export function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { user, userRole, profileData, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleRandom = async () => {
    try {
      // Determine current category based on pathname and extract sortBy and type
      let endpoint = '/api/browse'; // default
      let type = 'all';
      let sortBy = 'popular';

      if (pathname === '/') {
        // Home page - get trending content, use a mix of movies and TV
        endpoint = '/api/browse?sortBy=trending&type=all&page=1';
        sortBy = 'trending';
      } else if (pathname === '/browse') {
        // Check URL parameters for browse page
        const urlParams = new URLSearchParams(window.location.search);
        type = urlParams.get('type') || 'all';
        sortBy = urlParams.get('sortBy') || 'popular';
        endpoint = `/api/browse?sortBy=${sortBy}&type=${type}&page=1`;
      } else if (pathname === '/trending') {
        endpoint = '/api/browse?sortBy=trending&type=all&page=1';
        sortBy = 'trending';
      } else if (pathname === '/popular') {
        endpoint = '/api/browse?sortBy=popular&type=all&page=1';
        sortBy = 'popular';
      } else if (pathname === '/upcoming') {
        endpoint = '/api/browse?sortBy=newest&type=all&page=1';
        sortBy = 'newest';
      } else if (pathname === '/top-rated') {
        endpoint = '/api/browse?sortBy=top-rated&type=all&page=1';
        sortBy = 'top-rated';
      } else {
        // Default browse
        endpoint = '/api/browse?page=1';
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success && data.results && data.results.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.results.length);
        const randomItem = data.results[randomIndex];

        // Navigate to the random item's detail page
        let route = '/movies';
        if (randomItem.type === 'anime') {
          route = '/anime';
        } else if (randomItem.type === 'tv' || randomItem.type === 'series') {
          route = '/series';
        }

        router.push(`${route}/${randomItem.id}`);
      }
    } catch (error) {
      console.error('Error fetching random item:', error);
      // Fallback: just go to a default popular movie
      router.push('/movies/550'); // Fight Club as fallback
    }
  };

  const handleProfileClick = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsProfileMenuOpen(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Get user initials
  const getUserInitials = (user: any) => {
    if (user.displayName) {
      return user.displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    } else if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const browseCategories = [
    { name: 'Browse', href: '/browse' },
    { name: 'Trending', href: '/browse?sortBy=trending' },
    { name: 'Popular', href: '/browse?sortBy=popular' },
    { name: 'Upcoming', href: '/browse?sortBy=newest' },
    { name: 'Top Rated', href: '/browse?sortBy=top-rated' },
    { name: 'Random', href: null as string | null }
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4"
    >
      <div
        className="max-w-7xl mx-auto rounded-2xl px-4 md:px-6 py-3 backdrop-blur-md bg-black/30 border border-cyan-500/20"
        style={{
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.1), inset 0 0 30px rgba(6, 182, 212, 0.05)'
        }}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <motion.div
              className="flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <Film className="w-8 h-8 text-cyan-400" />
                <div
                  className="absolute inset-0 blur-xl bg-cyan-400/50"
                  style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                />
              </div>
              <span className="text-xl bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Cineova
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation - Large screens */}
          <div className="hidden lg:flex items-center gap-6">
            {browseCategories.map((category) => (
              <motion.div key={category.name} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {category.name === 'Random' ? (
                  <button
                    onClick={handleRandom}
                    className="relative px-4 py-2 text-cyan-100/80 hover:text-cyan-300 transition-colors group"
                  >
                    {category.name}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all duration-300" />
                  </button>
                ) : category.href ? (
                  <Link href={category.href}>
                    <button className="relative px-4 py-2 text-cyan-100/80 hover:text-cyan-300 transition-colors group">
                      {category.name}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all duration-300" />
                    </button>
                  </Link>
                ) : (
                  <button className="relative px-4 py-2 text-cyan-100/80 hover:text-cyan-300 transition-colors group">
                    {category.name}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all duration-300" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          {/* Medium Screens - Browse Dropdown */}
          <div className="hidden md:flex lg:hidden items-center gap-4">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 text-cyan-100/80 hover:text-cyan-300 transition-colors rounded-lg hover:bg-cyan-500/10"
              >
                <Menu className="w-4 h-4" />
                <span className="text-sm">Browse</span>
                <motion.div
                  animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </motion.button>

              {/* Browse Dropdown for Medium Screens */}
              <AnimatePresence>
                {isMobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-12 left-0 w-48 backdrop-blur-xl bg-black/90 border border-cyan-500/30 rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.3)' }}
                  >
                    <div className="p-2 space-y-1">
                      {browseCategories.map((category) => (
                        <div key={category.name}>
                          {category.name === 'Random' ? (
                            <button
                              onClick={() => {
                                handleRandom();
                                setIsMobileMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-cyan-100/80 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all text-sm"
                            >
                              {category.name}
                            </button>
                          ) : category.href ? (
                            <Link href={category.href}>
                              <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-full text-left px-3 py-2 text-cyan-100/80 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all text-sm"
                              >
                                {category.name}
                              </button>
                            </Link>
                          ) : (
                            <button
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="w-full text-left px-3 py-2 text-cyan-100/80 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all text-sm"
                            >
                              {category.name}
                            </button>
                          )}
                        </div>
                      ))}
                      {userRole === 'admin' && (
                        <Link href="/admin">
                          <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="w-full text-left px-3 py-2 text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 rounded-lg transition-all text-sm"
                          >
                            Admin
                          </button>
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Search and Mobile Menu */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 hover:border-cyan-400/60 transition-all"
              style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}
            >
              <Search className="w-5 h-5 text-cyan-300" />
            </motion.button>

            {/* User Avatar / Login Button */}
            {user ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="w-10 h-10 rounded-full border-2 border-violet-400/60 flex items-center justify-center relative"
                  style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' }}
                >
                  {profileData?.avatar !== undefined ? (
                    <img
                      src={getAvatarUrl(profileData.avatar)}
                      alt="User Avatar"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-white text-sm">${getUserInitials(user)}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <span className="text-white text-sm">{getUserInitials(user)}</span>
                  )}
                  {userRole === 'admin' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 border-2 border-black z-10" />
                  )}
                </motion.button>

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-12 w-64 backdrop-blur-xl bg-black/90 border border-cyan-500/30 rounded-2xl overflow-hidden"
                      style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.3)' }}
                    >
                      {/* User Info */}
                      <div className="p-4 border-b border-cyan-500/20">
                        <p className="text-cyan-100 mb-1">{user.displayName || 'User'}</p>
                        <p className="text-cyan-100/60 text-sm mb-2">{user.email}</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30">
                          <div className={`w-2 h-2 rounded-full ${userRole === 'admin' ? 'bg-yellow-400' : 'bg-cyan-400'}`} />
                          <span className="text-xs text-cyan-200 capitalize">{userRole || 'User'}</span>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={() => {
                            router.push('/profile');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-cyan-100 hover:bg-cyan-500/10 transition-all"
                        >
                          <UserCircle className="w-5 h-5 text-cyan-400" />
                          <span>Profile</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={() => {
                            router.push('/watchlist');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-cyan-100 hover:bg-violet-500/10 transition-all"
                        >
                          <LayoutDashboard className="w-5 h-5 text-violet-400" />
                          <span>Watchlist</span>
                        </motion.button>

                        {userRole === 'admin' && (
                          <motion.button
                            whileHover={{ x: 4 }}
                            onClick={() => {
                              router.push('/admin');
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-cyan-100 hover:bg-yellow-500/10 transition-all"
                          >
                            <LayoutDashboard className="w-5 h-5 text-yellow-400" />
                            <span>Admin Dashboard</span>
                          </motion.button>
                        )}

                        <div className="my-2 border-t border-cyan-500/20" />

                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/10 transition-all"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Logout</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsLoginModalOpen(true)}
                className="p-2 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 hover:border-violet-400/60 transition-all"
                style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
              >
                <User className="w-5 h-5 text-violet-300" />
              </motion.button>
            )}

            {/* Mobile Menu Button - Only for small screens */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-cyan-300" />
              ) : (
                <Menu className="w-5 h-5 text-cyan-300" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies, TV shows..."
                  className="w-full px-6 py-3 bg-black/40 border border-cyan-500/30 rounded-xl text-cyan-100 placeholder:text-cyan-100/40 focus:outline-none focus:border-cyan-400/60 backdrop-blur-sm"
                  style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)' }}
                  autoFocus
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/60" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
              className="sm:hidden"
            >
              <div className="flex flex-col gap-2">
                <div className="px-4 py-2 text-cyan-100/60 text-sm font-medium">Browse</div>
                {browseCategories.map((category) => (
                  <div key={category.name}>
                    {category.name === 'Random' ? (
                      <button
                        onClick={() => {
                          handleRandom();
                          setIsMobileMenuOpen(false);
                        }}
                        className="px-4 py-2 text-left text-cyan-100/80 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all w-full"
                      >
                        {category.name}
                      </button>
                    ) : category.href ? (
                      <Link href={category.href}>
                        <button
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="px-4 py-2 text-left text-cyan-100/80 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all w-full"
                        >
                          {category.name}
                        </button>
                      </Link>
                    ) : (
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="px-4 py-2 text-left text-cyan-100/80 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all w-full"
                      >
                        {category.name}
                      </button>
                    )}
                  </div>
                ))}
                {userRole === 'admin' && (
                  <Link href="/admin">
                    <button className="px-4 py-2 text-left text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/10 rounded-lg transition-all w-full">
                      Admin
                    </button>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </motion.nav>
  );
}
