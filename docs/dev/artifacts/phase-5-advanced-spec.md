# Phase 5: Advanced Features & Polish - Technical Specification

## Overview
Implement comprehensive Settings pages (Profile, Organization, Notifications, Security, System tabs) and wire Audit Log frontend to backend. Note: Audit Log backend already exists from Phase 4.

## Backend Models

### OrganizationSettings (single-row, id=1 enforced)
- `org_name`, `country`, `primary_contact_email`, `support_email`, `platform_name`, `primary_color` (hex)
- `updated_at`, `updated_by_id` (FK users)

### NotificationSettings (single-row, id=1 enforced)
- `email_notifications` (bool), `slack_webhook_url` (nullable), `workflow_failure_alerts` (bool)
- `daily_digest` (bool), `digest_time` (string HH:MM)
- `updated_at`, `updated_by_id` (FK users)

### SystemSettings (single-row, id=1 enforced, admin-only)
- `default_date_format`, `log_retention_days` (int), `default_timezone`, `max_concurrent_workflows` (int)
- `updated_at`, `updated_by_id` (FK users)

### ApiKey (multi-row)
- `id`, `user_id` (FK), `name`, `key_hash`, `key_prefix` (first 8 chars), `is_active`
- `created_at`, `last_used_at`

### User.avatar_url (add column)
- `avatar_url` (String(512), nullable)

## API Endpoints

### Profile (`/api/v1/auth/me`)
- `PUT /me` — update profile (full_name, email, avatar_url)
- `PUT /me/password` — change password (current_password, new_password)
- `DELETE /me` — soft-delete account

### Settings (`/api/v1/settings`)
- `GET/PUT /organization` — org settings
- `GET/PUT /notifications` — notification settings
- `GET/PUT /system` — system settings (admin only)
- `GET/POST /api-keys` — list/create API keys
- `DELETE /api-keys/{id}` — revoke API key

## Frontend Changes

### SettingsPage
- Wire Profile tab to `GET /auth/me` and `PUT /auth/me` / `PUT /auth/me/password`
- Implement Organization tab UI → `GET/PUT /settings/organization`
- Implement Notifications tab UI → `GET/PUT /settings/notifications`
- Implement Security tab UI → 2FA toggle + ApiKey CRUD → `GET/POST/DELETE /settings/api-keys`
- Implement System tab UI → `GET/PUT /settings/system` (admin only)

### AuditLogPage
- Wire to backend `/api/v1/audit-logs` with query params (action, resource_type, user_id)
- Add real pagination (skip, limit)
- Map backend response format to frontend expectations
