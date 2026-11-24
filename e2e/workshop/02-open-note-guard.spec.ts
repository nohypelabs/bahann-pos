import { expect, test } from '@playwright/test'
import { api, evidence, freshPlate, t } from './helpers'

test('a motor with an unpaid note cannot get a second one; the open note can be cancelled', async ({ page }) => {
  const a = api(page)
  await page.goto('/pos/notes')
  const plate = freshPlate('G')
  const { id: noteId } = await a.m<{ id: string }>('workshop.notes.open', { outletId: await a.outletId(), plate, brand: 'Honda', model: 'Vario' })

  // The list shows it.
  await page.reload()
  await expect(page.getByText(plate)).toBeVisible()

  await page.getByRole('button', { name: t('workshop.notes.new') }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(t('workshop.plate')).fill(plate.toLowerCase())
  await dialog.getByRole('button', { name: t('workshop.newNote.check') }).click()
  await expect(dialog.getByText(t('workshop.newNote.hasOpen'))).toBeVisible()
  await expect(dialog.getByRole('button', { name: t('workshop.newNote.open'), exact: true })).toBeDisabled()

  await dialog.getByRole('button', { name: t('workshop.newNote.openExisting') }).click()
  await page.waitForURL(`**/pos/notes/${noteId}`)

  await page.getByRole('button', { name: t('workshop.note.cancel') }).click()
  const cancel = page.getByRole('dialog')
  await expect(cancel.getByRole('button', { name: t('workshop.note.cancelConfirm') })).toBeDisabled()
  await cancel.getByLabel(t('workshop.note.cancelReason')).fill('Pelanggan batal (uji E2E)')
  await cancel.getByRole('button', { name: t('workshop.note.cancelConfirm') }).click()

  await expect.poll(async () => (await a.note(noteId)).status).toBe('cancelled')
  expect((await a.lookup(plate)).openServiceOrderId).toBeNull()
  evidence('guard', { plate, noteId, status: 'cancelled' })
})
