'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { useToast } from '@/components/ui/Toast'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  outletId?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })
  const { showToast } = useToast()

  useEffect(() => {
    // Load user data from localStorage
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user')
      if (user) {
        try {
          const parsedUser = JSON.parse(user)
          setUserData(parsedUser)
          setFormData({
            name: parsedUser.name || '',
            email: parsedUser.email || '',
          })
        } catch (error) {
          logger.error('Failed to parse user data', error)
          router.push('/login')
        }
      } else {
        router.push('/login')
      }
    }
  }, [router])

  const handleSaveProfile = () => {
    if (!userData) return

    // Update localStorage with new data
    const updatedUser = {
      ...userData,
      name: formData.name,
      email: formData.email,
    }

    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUserData(updatedUser)
    setIsEditing(false)

    showToast('Profile updated successfully!', 'success')
  }

  const handleCancelEdit = () => {
    if (userData) {
      setFormData({
        name: userData.name,
        email: userData.email,
      })
    }
    setIsEditing(false)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300', icon: '👑' }
      case 'manager':
        return { label: 'Manager', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300', icon: '⭐' }
      default:
        return { label: 'User (Cashier)', color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300', icon: '👤' }
    }
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 dark:border-gray-600 border-t-gray-900 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  const roleBadge = getRoleBadge(userData.role)
  const userInitial = userData.name.charAt(0).toUpperCase()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">User Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings and information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card variant="elevated" padding="lg">
          <CardBody>
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {userInitial}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userData.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</p>
              </div>

              <div className="flex justify-center">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${roleBadge.color}`}>
                  {roleBadge.icon} {roleBadge.label}
                </span>
              </div>

              <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">User ID</p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                  {userData.id}
                </p>
              </div>

              {userData.outletId && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned Outlet ID</p>
                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                    {userData.outletId}
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card variant="default" padding="lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                {!isEditing && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    ✏️ Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {isEditing ? (
                <div className="space-y-4">
                  <Input
                    type="text"
                    label="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    fullWidth
                    required
                  />

                  <Input
                    type="email"
                    label="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    fullWidth
                    required
                  />

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveProfile}
                      fullWidth
                    >
                      ✅ Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      fullWidth
                    >
                      ❌ Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Full Name</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{userData.name}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email Address</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{userData.email}</p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Role</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{roleBadge.label}</p>
                  </div>

                  {userData.outletId && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Assigned Outlet</p>
                      <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{userData.outletId}</p>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Account Settings */}
          <Card variant="default" padding="lg">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
                  <p className="text-sm text-yellow-900 dark:text-yellow-200 font-semibold mb-2">
                    ⚠️ Password Change
                  </p>
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 mb-3">
                    Password changes are currently not supported in this interface. Please contact your system administrator.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    🔒 Change Password
                  </Button>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-2">
                    🔐 Session Information
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    Your session is valid for 7 days. You'll be automatically logged out after that period.
                  </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-900 dark:text-red-200 font-semibold mb-2">
                    🚨 Danger Zone
                  </p>
                  <p className="text-xs text-red-800 dark:text-red-300 mb-3">
                    Once you logout, you'll need to sign in again with your credentials.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to logout?')) {
                        localStorage.removeItem('auth_token')
                        localStorage.removeItem('user')
                        router.push('/login')
                      }
                    }}
                  >
                    🚪 Logout
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Access Permissions */}
          <Card variant="default" padding="lg">
            <CardHeader>
              <CardTitle>Access Permissions</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Dashboard</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">View analytics and reports</p>
                  </div>
                  <span className="text-green-600 font-bold">✓</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Stock Management</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Record and manage inventory</p>
                  </div>
                  <span className="text-green-600 font-bold">✓</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">POS Sales</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Process transactions</p>
                  </div>
                  <span className="text-green-600 font-bold">✓</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Products & Outlets</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Manage master data</p>
                  </div>
                  <span className="text-green-600 font-bold">✓</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">User Management</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Create and manage users</p>
                  </div>
                  <span className={userData.role === 'admin' ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}>
                    {userData.role === 'admin' ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-2">💡 Profile Information:</p>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Your profile information is stored locally on this device</li>
          <li>• Contact your administrator to change your role or assigned outlet</li>
          <li>• Keep your email address up to date for important notifications</li>
          <li>• Your session will expire after 7 days of inactivity</li>
        </ul>
      </div>
    </div>
  )
}
