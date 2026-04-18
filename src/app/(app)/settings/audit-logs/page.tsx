'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { trpc } from '@/lib/trpc/client'

export default function AuditLogsPage() {
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedEntityType, setSelectedEntityType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 50

  // Fetch filter options
  const { data: filterOptions } = trpc.audit.getFilterOptions.useQuery()

  // Fetch audit logs
  const { data: logsData, isLoading } = trpc.audit.getLogs.useQuery({
    action: selectedAction || undefined,
    entityType: selectedEntityType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    searchQuery: searchQuery || undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
  })

  // Fetch stats
  const { data: stats } = trpc.audit.getStats.useQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  const logs = logsData?.logs || []
  const total = logsData?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
      case 'UPDATE':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
      case 'LOGIN':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300'
      case 'LOGOUT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const handleClearFilters = () => {
    setSelectedAction('')
    setSelectedEntityType('')
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
    setCurrentPage(0)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Audit Logs</h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and monitor all system activities for compliance and security
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="default" padding="lg">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Logs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalLogs.toLocaleString()}
              </p>
            </div>
          </Card>

          <Card variant="default" padding="lg">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Unique Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.uniqueUsersCount}
              </p>
            </div>
          </Card>

          <Card variant="default" padding="lg">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Entity Types</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {Object.keys(stats.byEntityType).length}
              </p>
            </div>
          </Card>

          <Card variant="default" padding="lg">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Action Types</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {Object.keys(stats.byAction).length}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Action"
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value)
                setCurrentPage(0)
              }}
              options={[
                { value: '', label: 'All Actions' },
                ...(filterOptions?.actions.map((action) => ({
                  value: action,
                  label: action,
                })) || []),
              ]}
              fullWidth
            />
            <Select
              label="Entity Type"
              value={selectedEntityType}
              onChange={(e) => {
                setSelectedEntityType(e.target.value)
                setCurrentPage(0)
              }}
              options={[
                { value: '', label: 'All Types' },
                ...(filterOptions?.entityTypes.map((type) => ({
                  value: type,
                  label: type.charAt(0).toUpperCase() + type.slice(1),
                })) || []),
              ]}
              fullWidth
            />
            <Input
              type="text"
              label="Search"
              placeholder="Search by user email or entity ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(0)
              }}
              fullWidth
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              type="date"
              label="Date From"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setCurrentPage(0)
              }}
              fullWidth
            />
            <Input
              type="date"
              label="Date To"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setCurrentPage(0)
              }}
              fullWidth
            />
          </div>
        </CardBody>
      </Card>

      {/* Audit Logs Table */}
      <Card variant="default" padding="lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Log</CardTitle>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-semibold rounded-full">
              {total.toLocaleString()} logs
            </span>
          </div>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <p>Loading audit logs...</p>
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">📋</div>
              <p className="font-semibold">No audit logs found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Timestamp
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        User
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Action
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Entity
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Entity ID
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr
                        key={log.id}
                        className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <td className="py-4 px-4">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatDateTime(log.created_at)}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{log.user_email}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {log.user_id.slice(0, 8)}...
                          </p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-gray-700 dark:text-gray-300 capitalize">{log.entity_type}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {log.entity_id ? `${log.entity_id.slice(0, 12)}...` : 'N/A'}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {currentPage * pageSize + 1} to{' '}
                    {Math.min((currentPage + 1) * pageSize, total)} of {total} logs
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Log Details</h2>
              <button
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 text-2xl"
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Timestamp</p>
                <p className="text-gray-900 dark:text-gray-100">{formatDateTime(selectedLog.created_at)}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">User</p>
                <p className="text-gray-900 dark:text-gray-100">{selectedLog.user_email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{selectedLog.user_id}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Action</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getActionBadgeColor(
                    selectedLog.action
                  )}`}
                >
                  {selectedLog.action}
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Entity Type</p>
                <p className="text-gray-900 dark:text-gray-100 capitalize">{selectedLog.entity_type}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Entity ID</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {selectedLog.entity_id || 'N/A'}
                </p>
              </div>

              {selectedLog.changes && (
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Changes</p>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Metadata</p>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.ip_address && (
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">IP Address</p>
                  <p className="text-gray-900 dark:text-gray-100 font-mono">{selectedLog.ip_address}</p>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">User Agent</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
