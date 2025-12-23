"use client";

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Edit2, Check, Lock, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from './Navbar';
import { avatarIds, getAvatarUrl } from '@/lib/utils';

interface ProfileData {
  uid: string;
  email: string;
  username: string;
  name: string;
  avatar: number;
  role: 'admin' | 'user';
}

export function ProfilePage() {
  const { user, profileData, refreshProfileData, loading: authLoading } = useAuth();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [usernameBase, setUsernameBase] = useState('');
  const [usernameTag, setUsernameTag] = useState('0001');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (profileData && profileData.username) {
      const parts = profileData.username.split('#');
      if (parts.length === 2) {
        setUsernameBase(parts[0] || '');
        setUsernameTag(parts[1] || '0001');
      } else {
        setUsernameBase(profileData.username);
        setUsernameTag('0001');
      }
    } else if (profileData) {
      setUsernameBase('');
      setUsernameTag('0001');
    }
    if (profileData) {
      setName(profileData.name || '');
      setSelectedAvatar(profileData.avatar || 0);
    }
  }, [profileData]);

  const handleSaveProfile = async (field: 'username' | 'name') => {
    if (!user || !profileData) return;

    let value: string;
    if (field === 'username') {
      // Ensure tag is 4 digits
      const formattedTag = usernameTag.padStart(4, '0');
      value = `${usernameBase}#${formattedTag}`;
    } else {
      value = name;
    }

    // Frontend validation
    if (!value || value.trim().length === 0) {
      setUpdateError(`${field === 'username' ? 'Username' : 'Name'} cannot be empty`);
      return;
    }

    setIsUpdating(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const requestBody: any = {
        name: field === 'name' ? value.trim() : profileData.name,
        avatar: selectedAvatar,
      };

      // Include username if we're updating username
      if (field === 'username') {
        requestBody.username = value.trim();
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();

      await refreshProfileData(); // Refresh the global profile data
      if (field === 'username') {
        setIsEditingUsername(false);
      } else {
        setIsEditingName(false);
      }
      setUpdateSuccess('Profile updated successfully!');
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      setPasswordError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-4 md:px-8 flex items-center justify-center">
        <div className="text-center">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-4 md:px-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-cyan-100 mb-4">Please log in to view your profile</h2>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-4 md:px-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-cyan-100 mb-4">Failed to load profile data</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050510] dark overflow-x-hidden">
      <Navbar />
      <div className="pt-32 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl mb-4 bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
              Profile Settings
            </h1>
            <p className="text-cyan-100/60">Manage your account settings and preferences</p>
          </div>

          {/* Profile Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 rounded-2xl backdrop-blur-md bg-black/40 border border-cyan-500/20 mb-6"
            style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
          >
            <h2 className="text-2xl text-cyan-100 mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-cyan-400" />
              Profile Information
            </h2>

            {/* Username */}
            <div className="mb-6">
              <label className="block text-sm text-cyan-100/80 mb-3">Username</label>
              <div className="flex gap-3">
                <div className="flex-1 flex gap-2">
                  <div className="w-full">
                    <input
                      type="text"
                      value={usernameBase}
                      onChange={(e) => setUsernameBase(e.target.value)}
                      disabled={!isEditingUsername}
                      className="w-full px-4 py-3 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Username"
                    />
                  </div>
                  <div className="w-32">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400">#</span>
                      <input
                        type="text"
                        value={usernameTag}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setUsernameTag(val);
                        }}
                        onBlur={() => {
                          setUsernameTag(usernameTag.padStart(4, '0'));
                        }}
                        disabled={!isEditingUsername}
                        className="w-full pl-8 pr-4 py-3 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="0000"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>

                {!isEditingUsername ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditingUsername(true)}
                    className="px-6 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 flex items-center gap-2 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSaveProfile('username')}
                    disabled={isUpdating}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}
                  >
                    <Check className="w-4 h-4" />
                    {isUpdating ? 'Saving...' : 'Save'}
                  </motion.button>
                )}
              </div>
              <p className="mt-2 text-cyan-100/40 text-sm">
                Your unique identifier: {usernameBase}#{usernameTag}
              </p>
            </div>

            {/* Full Name (parameter under username) */}
            <div className="mb-6">
              <label className="block text-sm text-cyan-100/80 mb-3">Full Name</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditingName}
                  className="flex-1 px-4 py-3 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Enter your full name"
                  required
                  minLength={1}
                />

                {!isEditingName ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditingName(true)}
                    className="px-6 py-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 flex items-center gap-2 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSaveProfile('name')}
                    disabled={isUpdating}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}
                  >
                    <Check className="w-4 h-4" />
                    {isUpdating ? 'Saving...' : 'Save'}
                  </motion.button>
                )}
              </div>
            </div>

            {/* Email (Read-only) */}
            <div className="mb-6">
              <label className="block text-sm text-cyan-100/80 mb-3">Email</label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full px-4 py-3 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 opacity-60 cursor-not-allowed"
              />
            </div>

            {/* Role Badge */}
            <div className="mb-6">
              <label className="block text-sm text-cyan-100/80 mb-3">Account Type</label>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30">
                <div className={`w-2 h-2 rounded-full ${profileData.role === 'admin' ? 'bg-yellow-400' : 'bg-cyan-400'}`} />
                <span className="text-cyan-200 capitalize">{profileData.role}</span>
              </div>
            </div>

            {/* Error/Success Messages */}
            {updateError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-300">{updateError}</p>
              </div>
            )}

            {updateSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-300">{updateSuccess}</p>
              </div>
            )}
          </motion.div>

          {/* Avatar Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-8 rounded-2xl backdrop-blur-md bg-black/40 border border-cyan-500/20 mb-6"
            style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
          >
            <h2 className="text-2xl text-cyan-100 mb-6">Choose Avatar</h2>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
              {avatarIds.map((avatarId, index) => (
                <motion.button
                  key={avatarId}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedAvatar(index);
                    setUpdateSuccess('');
                    setUpdateError('');
                  }}
                  className={`relative rounded-xl overflow-hidden aspect-square ${
                    selectedAvatar === index
                      ? 'ring-4 ring-cyan-400'
                      : 'ring-2 ring-cyan-500/30'
                  }`}
                  style={
                    selectedAvatar === index
                      ? { boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)' }
                      : {}
                  }
                >
                  <img
                    src={getAvatarUrl(avatarId)}
                    alt={`Avatar ${avatarId}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to a default avatar if image fails to load
                      (e.target as HTMLImageElement).src = '/avatars/default-avatar.jpg';
                    }}
                  />
                  {selectedAvatar === index && (
                    <div className="absolute inset-0 bg-cyan-400/20 flex items-center justify-center">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
            <p className="mt-4 text-cyan-100/60 text-sm">
              Selected: Avatar <span className="text-cyan-300">#{avatarIds[selectedAvatar] || selectedAvatar}</span>
            </p>

            {selectedAvatar !== (profileData.avatar || 0) && (
              <div className="mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSaveProfile('name')}
                  disabled={isUpdating}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}
                >
                  {isUpdating ? 'Updating...' : `Apply Avatar #${avatarIds[selectedAvatar] || selectedAvatar}`}
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* Change Password */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-8 rounded-2xl backdrop-blur-md bg-black/40 border border-cyan-500/20"
              style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.15)' }}
            >
              <h2 className="text-2xl text-cyan-100 mb-6 flex items-center gap-2">
                <Lock className="w-6 h-6 text-cyan-400" />
                Change Password
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm text-cyan-100/80 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60"
                    placeholder="Enter current password"
                    required
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm text-cyan-100/80 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm text-cyan-100/80 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-black/60 border border-cyan-500/30 text-cyan-100 focus:outline-none focus:border-cyan-400/60"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>

                {/* Error/Success Messages */}
                {passwordError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-300">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-sm text-green-300">{passwordSuccess}</p>
                  </div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isChangingPassword}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)' }}
                >
                  <Save className="w-5 h-5" />
                  {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* Info for non-password auth users */}
          {/* Since we only support email/password, this section is not needed */}
        </div>
      </div>
    </div>
  );
}
