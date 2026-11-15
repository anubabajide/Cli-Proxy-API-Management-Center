/**
 * Claude usage guardrails: the card row (state + Configure) and its dialog.
 * Values are minimum remaining percentages that CPA preserves per usage window.
 */

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { QuotaClassMap } from '../../types';
import {
  CLAUDE_QUOTA_RESERVE_WINDOWS,
  type ClaudeQuotaReserveDraft,
  type ClaudeQuotaReserveKey,
} from './quotaReserve';
import styles from '../codex/CodexCreditOverage.module.scss';

export interface ClaudeQuotaReserveRowProps {
  configured: boolean;
  classes: QuotaClassMap;
  disabled: boolean;
  name: string;
  onManage: () => void;
}

export function ClaudeQuotaReserveRow({
  configured,
  classes,
  disabled,
  name,
  onManage,
}: ClaudeQuotaReserveRowProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.quotaRow}>
      <div className={classes.quotaRowHeader}>
        <div className={classes.claudeExtraUsageTitle}>
          <span className={classes.quotaModel}>{t('claude_quota.reserve_label')}</span>
          <span className={styles.status} data-state={configured ? 'blocked' : 'unknown'}>
            {t(configured ? 'claude_quota.reserve_state_on' : 'claude_quota.reserve_state_off')}
          </span>
        </div>
        <button
          type="button"
          className={styles.manage}
          onClick={onManage}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-label={t('claude_quota.reserve_manage_aria', { name })}
        >
          {t('claude_quota.reserve_manage')}
        </button>
      </div>
    </div>
  );
}

export interface ClaudeQuotaReserveDialogProps {
  open: boolean;
  name: string;
  draft: ClaudeQuotaReserveDraft;
  invalid: ClaudeQuotaReserveKey[];
  error: string | null;
  saving: boolean;
  onChange: (key: ClaudeQuotaReserveKey, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function ClaudeQuotaReserveDialog({
  open,
  name,
  draft,
  invalid,
  error,
  saving,
  onChange,
  onSave,
  onClose,
}: ClaudeQuotaReserveDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('claude_quota.reserve_dialog_title')}
      closeDisabled={saving}
      footer={
        <Button type="button" onClick={onSave} disabled={saving} loading={saving}>
          {t('common.save')}
        </Button>
      }
    >
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>{t('codex_quota.credit_overage_account')}</dt>
          <dd>{name}</dd>
        </div>
      </dl>
      <p className={styles.intro}>{t('claude_quota.reserve_intro')}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        {CLAUDE_QUOTA_RESERVE_WINDOWS.map(({ key, labelKey }) => (
          <Input
            key={key}
            label={t(labelKey)}
            type="number"
            inputMode="decimal"
            min={0}
            max={99}
            step="any"
            placeholder={t('claude_quota.reserve_placeholder')}
            value={draft[key]}
            disabled={saving}
            onChange={(event) => onChange(key, event.target.value)}
            error={invalid.includes(key) ? t('claude_quota.reserve_invalid') : undefined}
            hint={key === 'seven_day_fable' ? t('claude_quota.reserve_fable_hint') : undefined}
            rightElement={<span aria-hidden="true">%</span>}
          />
        ))}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
      <p className={styles.scope}>{t('claude_quota.reserve_scope_note')}</p>
      {error && (
        <div className={styles.feedback} data-tone="error" role="alert">
          <p>{error}</p>
        </div>
      )}
    </Modal>
  );
}
