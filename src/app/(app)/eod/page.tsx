'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default function EODPage() {
  const [selectedOutlet, setSelectedOutlet] = useState('')
  const [openingCash, setOpeningCash] = useState(0)
  const [closingCash, setClosingCash] = useState(0)
  const [notes, setNotes] = useState('')

  const { data: outletsData } = trpc.outlets.getAll.useQuery()
  const { data: currentSession, refetch } = trpc.cashSessions.getCurrent.useQuery(
    { outletId: selectedOutlet },
    { enabled: !!selectedOutlet }
  )

  const openMutation = trpc.cashSessions.open.useMutation({ onSuccess: () => refetch() })
  const closeMutation = trpc.cashSessions.close.useMutation({ onSuccess: () => refetch() })

  const handleOpenDay = async () => {
    if (!selectedOutlet) {
      alert('Please select an outlet')
      return
    }

    try {
      await openMutation.mutateAsync({
        outletId: selectedOutlet,
        openingCash,
      })
      alert('Cash session opened successfully')
      setOpeningCash(0)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to open session')
    }
  }

  const handleCloseDay = async () => {
    if (!currentSession) return

    try {
      const result = await closeMutation.mutateAsync({
        sessionId: currentSession.id,
        closingCash,
        notes,
      })

      if (result.difference !== 0) {
        const variance = result.difference > 0 ? 'overage' : 'shortage'
        alert(`Day closed! Cash ${variance}: ${formatCurrency(Math.abs(result.difference))}`)
      } else {
        alert('Day closed successfully! Cash matches perfectly.')
      }

      setClosingCash(0)
      setNotes('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to close session')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">End of Day</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage daily cash sessions and reports</p>
      </div>

      {/* Outlet Selection */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <CardTitle>Select Outlet</CardTitle>
        </CardHeader>
        <CardBody>
          <Select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            options={[
              { value: '', label: 'Choose an outlet...' },
              ...(outletsData?.outlets?.map(o => ({ value: o.id, label: o.name })) || []),
            ]}
            fullWidth
          />
        </CardBody>
      </Card>

      {selectedOutlet && !currentSession && (
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Start New Day</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No active session for this outlet. Start a new day by entering the opening cash amount.
              </p>
              <Input
                type="number"
                label="Opening Cash Amount"
                value={openingCash}
                onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                fullWidth
              />
              <Button
                variant="primary"
                onClick={handleOpenDay}
                disabled={openMutation.isPending}
              >
                {openMutation.isPending ? 'Opening...' : 'Start Day'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {selectedOutlet && currentSession && (
        <>
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Current Session</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Opened At</p>
                  <p className="text-sm font-semibold">{formatDateTime(currentSession.opened_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Opening Cash</p>
                  <p className="text-lg font-bold">{formatCurrency(currentSession.opening_cash)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Opened By</p>
                  <p className="text-sm font-semibold">
                    {currentSession.opened_by_user?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Status</p>
                  <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs font-semibold rounded">
                    OPEN
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card variant="default" padding="lg">
            <CardHeader>
              <CardTitle>Close Day</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Count the cash in the drawer and enter the amount below to close the day.
                </p>

                <Input
                  type="number"
                  label="Closing Cash Count"
                  value={closingCash}
                  onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)}
                  fullWidth
                />

                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {closingCash > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Opening Cash:</span>
                      <span className="font-semibold">{formatCurrency(currentSession.opening_cash)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Closing Cash:</span>
                      <span className="font-semibold">{formatCurrency(closingCash)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t">
                      <span>Expected Difference:</span>
                      <span className={closingCash - currentSession.opening_cash >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(closingCash - currentSession.opening_cash)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleCloseDay}
                  disabled={closeMutation.isPending || closingCash <= 0}
                >
                  {closeMutation.isPending ? 'Closing...' : 'Close Day'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
