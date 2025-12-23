import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
   const { loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(formData.email, formData.password);
        toast.success('Successfully signed in!');
        onClose();
      } else {
        await registerWithEmail(formData.email, formData.password, formData.name);
        toast.success('Account created successfully!');
        onClose();
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };


  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Please enter your email address first');
      return;
    }

    try {
      await resetPassword(formData.email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send password reset email');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glow Effect */}
              <div
                className="absolute inset-0 blur-3xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 rounded-3xl"
              />

              {/* Modal Content */}
              <div
                className="relative backdrop-blur-xl bg-black/60 border border-cyan-500/30 rounded-3xl p-8 shadow-2xl"
                style={{ boxShadow: '0 0 80px rgba(6, 182, 212, 0.3)' }}
              >
                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400/60 transition-all"
                >
                  <X className="w-5 h-5 text-cyan-300" />
                </motion.button>

                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl mb-2 bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                    {isLogin ? 'Welcome Back' : 'Join CineStream'}
                  </h2>
                  <p className="text-cyan-100/60">
                    {isLogin ? 'Sign in to continue your journey' : 'Create your account to get started'}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name Field (Signup only) */}
                  <AnimatePresence mode="wait">
                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/60" />
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-cyan-500/30 rounded-xl text-cyan-100 placeholder:text-cyan-100/40 focus:outline-none focus:border-cyan-400/60 backdrop-blur-sm transition-all"
                            style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email Field */}
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/60" />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 bg-black/40 border border-cyan-500/30 rounded-xl text-cyan-100 placeholder:text-cyan-100/40 focus:outline-none focus:border-cyan-400/60 backdrop-blur-sm transition-all"
                      style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                    />
                  </div>

                  {/* Password Field */}
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/60" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-12 pr-12 py-3.5 bg-black/40 border border-cyan-500/30 rounded-xl text-cyan-100 placeholder:text-cyan-100/40 focus:outline-none focus:border-cyan-400/60 backdrop-blur-sm transition-all"
                      style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400/60 hover:text-cyan-400 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Forgot Password (Login only) */}
                  {isLogin && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-cyan-300/80 hover:text-cyan-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.5)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative">
                      {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </span>
                  </motion.button>
                </form>

                {/* Toggle Login/Signup */}
                <div className="mt-6 text-center">
                  <p className="text-cyan-100/60">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    {' '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
