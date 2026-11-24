import { expect, test } from '@playwright/test'
import { api, evidence, freshPlate, openNoteViaDialog, t } from './helpers'

// The PWA service worker serves the page from its cache when there is no network.
test.use({ serviceWorkers: 'allow' })

test('the station page reloads with no internet and keeps the work done offline', async ({ page, context }) => {
  const a = api(page)
  await page.goto('/pos/notes')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  // A second load goes through the worker, which caches the page and its scripts.
  await page.reload()
  await expect(page.getByText(t('workshop.offline.allSent'))).toBeVisible()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  const plate = freshPlate('R')
  const noteId = await openNoteViaDialog(page, plate, { brand: 'Kawasaki' })

  // F5 with no internet, on the note itself (?note=…) and on the list.
  await page.reload()
  await expect(page.getByText(plate, { exact: true })).toBeVisible()
  await expect(page.getByRole('status')).toContainText(t('workshop.offline.offline'))
  await page.goto('/pos/notes')
  await expect(page.getByRole('button', { name: new RegExp(plate) })).toContainText(t('workshop.offline.notSent'))

  await context.setOffline(false)
  await expect(page.getByRole('status')).toContainText(t('workshop.offline.allSent'), { timeout: 45_000 })
  await expect.poll(() => a.noteStatus(noteId), { timeout: 30_000 }).toBe('open')

  await a.m('workshop.notes.cancel', { id: noteId, reason: 'E2E cleanup' })
  evidence('offline-reload', { plate, noteId })
})
