/** State and save action for the Claude usage-guardrail dialog. */

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authFilesApi } from '@/services/api';
import { useNotificationStore } from '@/stores';
import type { AuthFileItem } from '@/types';
import { getErrorMessage } from '@/utils/helpers';
import {
  claudeQuotaReserveDraft,
  parseClaudeQuotaReserveDraft,
  readClaudeQuotaReserve,
  type ClaudeQuotaReserveDraft,
  type ClaudeQuotaReserveKey,
} from './quotaReserve';

export function useClaudeQuotaReserve(file: AuthFileItem, onSaved?: () => void | Promise<void>) {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const reserve = readClaudeQuotaReserve(file);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ClaudeQuotaReserveDraft>(() =>
    claudeQuotaReserveDraft(reserve)
  );
  const [invalid, setInvalid] = useState<ClaudeQuotaReserveKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const openDialog = useCallback(() => {
    setDraft(claudeQuotaReserveDraft(readClaudeQuotaReserve(file)));
    setInvalid([]);
    setError(null);
    setOpen(true);
  }, [file]);

  const closeDialog = useCallback(() => {
    if (!inFlight.current) setOpen(false);
  }, []);

  const updateDraft = useCallback((key: ClaudeQuotaReserveKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setInvalid((current) => current.filter((item) => item !== key));
  }, []);

  const save = useCallback(async () => {
    if (inFlight.current) return;
    const parsed = parseClaudeQuotaReserveDraft(draft);
    if (!parsed.ok) {
      setInvalid(parsed.invalid);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await authFilesApi.patchFields(file.name, { quota_reserve: parsed.reserve });
      setOpen(false);
      showNotification(t('claude_quota.reserve_saved', { name: file.name }), 'success');
      await onSaved?.();
    } catch (errorSave: unknown) {
      setError(getErrorMessage(errorSave, t('common.unknown_error')));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [draft, file.name, onSaved, showNotification, t]);

  return {
    reserve,
    open,
    draft,
    invalid,
    error,
    saving,
    openDialog,
    closeDialog,
    updateDraft,
    save,
  };
}
