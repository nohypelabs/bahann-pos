'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/Button'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)

  useEffect(() => {
    // Request camera permission first
    requestCameraPermission()

    return () => {
      stopScanning()
    }
  }, [])

  const requestCameraPermission = async () => {
    try {
      // Check if navigator.mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API not supported in this browser')
        setPermissionGranted(false)
        return
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera
      })

      // Permission granted! Stop the stream (we just needed permission)
      stream.getTracks().forEach(track => track.stop())
      setPermissionGranted(true)
      setError(null)

      // Now get available cameras
      await getCameraList()
    } catch (err: any) {
      console.error('Camera permission error:', err)
      setPermissionGranted(false)

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('📷 Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser/sistem.')
      } else if (err.name === 'NotFoundError') {
        setError('📷 Kamera tidak ditemukan pada perangkat ini.')
      } else if (err.name === 'NotReadableError') {
        setError('📷 Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut dan coba lagi.')
      } else {
        setError(`📷 Gagal mengakses kamera: ${err.message || 'Unknown error'}`)
      }
    }
  }

  const getCameraList = async () => {
    try {
      const devices = await Html5Qrcode.getCameras()
      if (devices && devices.length > 0) {
        const cameraList = devices.map((device) => ({
          id: device.id,
          label: device.label || `Camera ${device.id}`,
        }))
        setCameras(cameraList)
        // Prefer back camera for mobile
        const backCamera = devices.find((d) => d.label.toLowerCase().includes('back'))
        setSelectedCamera(backCamera?.id || devices[0].id)
      } else {
        setError('Tidak ada kamera yang ditemukan')
      }
    } catch (err) {
      console.error('Error getting cameras:', err)
      setError('Gagal mendapatkan daftar kamera')
    }
  }

  const startScanning = async () => {
    if (!selectedCamera) {
      setError('Please select a camera')
      return
    }

    try {
      const html5QrCode = new Html5Qrcode('barcode-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText)
          stopScanning()
        },
        (errorMessage) => {
          // Error callback (scanning in progress, not an actual error)
          // console.log('Scanning...', errorMessage)
        }
      )

      setIsScanning(true)
      setError(null)
    } catch (err) {
      console.error('Error starting scanner:', err)
      setError('Failed to start camera. Please check permissions.')
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
        setIsScanning(false)
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
    }
  }

  const handleClose = () => {
    stopScanning()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-3 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-2xl font-bold text-gray-900">📷 Scan Barcode</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-base md:text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Permission Status */}
        {permissionGranted === null && (
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-sm font-semibold text-blue-900">📷 Meminta izin akses kamera...</p>
            <p className="text-xs text-blue-700 mt-1">Silakan izinkan akses kamera saat diminta browser.</p>
          </div>
        )}

        {permissionGranted === false && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl space-y-3">
            <div>
              <p className="text-sm font-semibold text-red-900">❌ {error}</p>
              <p className="text-xs text-red-700 mt-2">Untuk menggunakan scanner barcode, Anda perlu:</p>
              <ul className="text-xs text-red-700 mt-1 ml-4 list-disc space-y-1">
                <li>Izinkan akses kamera di browser</li>
                <li>Periksa pengaturan kamera perangkat</li>
                <li>Pastikan tidak ada aplikasi lain yang menggunakan kamera</li>
              </ul>
            </div>
            <Button variant="primary" onClick={requestCameraPermission} fullWidth>
              🔄 Coba Lagi
            </Button>
          </div>
        )}

        {permissionGranted === true && error && (
          <div className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
            <p className="text-sm font-semibold text-yellow-900">⚠️ {error}</p>
          </div>
        )}

        {permissionGranted === true && cameras.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Select Camera
            </label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              disabled={isScanning}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-gray-100"
            >
              {cameras.map((camera, index) => (
                <option key={`${camera.id}-${index}`} value={camera.id}>
                  {camera.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          id="barcode-reader"
          className="w-full rounded-xl overflow-hidden border-2 border-gray-300"
          style={{ minHeight: '300px' }}
        />

        {permissionGranted === true && (
          <div className="flex gap-3">
            {!isScanning ? (
              <Button
                variant="primary"
                onClick={startScanning}
                disabled={!selectedCamera}
                fullWidth
              >
                📷 Start Scanning
              </Button>
            ) : (
              <Button variant="secondary" onClick={stopScanning} fullWidth>
                ⏸️ Stop Scanning
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} fullWidth>
              Close
            </Button>
          </div>
        )}

        {permissionGranted !== true && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} fullWidth>
              Close
            </Button>
          </div>
        )}

        <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <p className="text-xs text-blue-900 font-semibold">💡 Tips:</p>
          <ul className="text-xs text-blue-800 space-y-1 mt-1">
            <li>• Hold the barcode steady in front of the camera</li>
            <li>• Make sure there's good lighting</li>
            <li>• Keep the barcode within the scanning box</li>
            <li>• Supports QR codes, EAN-13, Code128, and more</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
