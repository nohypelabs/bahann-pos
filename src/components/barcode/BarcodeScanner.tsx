'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { X, Camera, RefreshCw } from 'lucide-react'
import { friendlyError } from '@/lib/errors/friendlyError'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { t } = useLanguage()
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)

  useEffect(() => {
    requestCameraPermission()
    return () => { stopScanning() }
  }, [])

  const requestCameraPermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(t('scanner.cameraError'))
        setPermissionGranted(false)
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      stream.getTracks().forEach(track => track.stop())
      setPermissionGranted(true)
      setError(null)
      await getCameraList()
    } catch (err: any) {
      setPermissionGranted(false)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(t('scanner.permissionDenied'))
      } else if (err.name === 'NotFoundError') {
        setError(t('scanner.cameraNotFound'))
      } else if (err.name === 'NotReadableError') {
        setError(t('scanner.cameraInUse'))
      } else {
        setError(`${t('scanner.cameraError')}: ${friendlyError(err, 'Unknown error')}`)
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
        const backCamera = devices.find((d) => d.label.toLowerCase().includes('back'))
        setSelectedCamera(backCamera?.id || devices[0].id)
      } else {
        setError(t('scanner.noCameras'))
      }
    } catch {
      setError(t('scanner.failedCameraList'))
    }
  }

  const startScanning = async () => {
    if (!selectedCamera) return

    try {
      const html5QrCode = new Html5Qrcode('barcode-reader')
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        selectedCamera,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText)
          stopScanning()
        },
        () => {}
      )

      setIsScanning(true)
      setError(null)
    } catch {
      setError(t('scanner.cameraError'))
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
        setIsScanning(false)
      } catch { /* ignore */ }
    }
  }

  const handleClose = () => {
    stopScanning()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-3 md:p-6 space-y-4 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">{t('scanner.title')}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission: requesting */}
        {permissionGranted === null && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{t('scanner.requestingPermission')}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{t('scanner.allowPrompt')}</p>
          </div>
        )}

        {/* Permission: denied */}
        {permissionGranted === false && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl space-y-3">
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">{error}</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-2">{t('scanner.toUse')}</p>
              <ul className="text-xs text-red-700 dark:text-red-300 mt-1 ml-4 list-disc space-y-1">
                <li>{t('scanner.allowBrowser')}</li>
                <li>{t('scanner.checkSettings')}</li>
                <li>{t('scanner.closeOtherApps')}</li>
              </ul>
            </div>
            <Button variant="primary" onClick={requestCameraPermission} fullWidth>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              {t('scanner.retry')}
            </Button>
          </div>
        )}

        {/* Permission: granted but error */}
        {permissionGranted === true && error && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl">
            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">{error}</p>
          </div>
        )}

        {/* Camera selector */}
        {permissionGranted === true && cameras.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('scanner.selectCamera')}
            </label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              disabled={isScanning}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all disabled:opacity-50"
            >
              {cameras.map((camera, index) => (
                <option key={`${camera.id}-${index}`} value={camera.id}>
                  {camera.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Camera viewport */}
        <div
          id="barcode-reader"
          className="w-full rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 bg-black"
          style={{ minHeight: '300px' }}
        />

        {/* Action buttons */}
        {permissionGranted === true && (
          <div className="flex gap-3">
            {!isScanning ? (
              <Button variant="primary" onClick={startScanning} disabled={!selectedCamera} fullWidth>
                <Camera className="w-4 h-4 mr-1.5" />
                {t('scanner.startScanning')}
              </Button>
            ) : (
              <Button variant="secondary" onClick={stopScanning} fullWidth>
                {t('scanner.stopScanning')}
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} fullWidth>
              {t('scanner.close')}
            </Button>
          </div>
        )}

        {permissionGranted !== true && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} fullWidth>
              {t('scanner.close')}
            </Button>
          </div>
        )}

        {/* Tips */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="text-xs text-blue-900 dark:text-blue-200 font-semibold">{t('scanner.tips')}</p>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 mt-1">
            <li>• {t('scanner.tip1')}</li>
            <li>• {t('scanner.tip2')}</li>
            <li>• {t('scanner.tip3')}</li>
            <li>• {t('scanner.tip4')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
