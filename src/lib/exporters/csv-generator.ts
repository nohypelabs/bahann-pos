/**
 * CSV Generator (Lazy Loaded)
 * CSV generation utility - only loaded when needed
 */

import { logger } from '@/lib/logger'

export async function generateCSV(data: any) {
  logger.info('Generating CSV...')

  // Generate CSV content
  let csv = 'Date,Revenue,Items Sold\n'

  if (data.salesTrend) {
    data.salesTrend.forEach((row: any) => {
      csv += `${row.date},${row.revenue},${row.itemsSold}\n`
    })
  }

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `sales-data-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
