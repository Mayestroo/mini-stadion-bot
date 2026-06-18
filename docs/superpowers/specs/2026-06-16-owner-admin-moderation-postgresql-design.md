# Owner Admin, Moderation, And PostgreSQL Design

## Context

The project currently uses a Next.js frontend, a FastAPI backend, and SQLite. It already has users, stadiums, bookings, Telegram Mini App screens, and basic admin functionality. This feature adds a stadium owner admin area, a superadmin approval workflow, and replaces SQLite with PostgreSQL running through Docker.

Existing SQLite data will not be migrated. The PostgreSQL database will start clean and be populated by seed data.

## Goals

- Let verified stadium owners manage their own stadium data, prices, work hours, images, bookings, customers, statistics, and notifications.
- Require superadmin approval before owner changes to stadium data or images become public.
- Let owners confirm bookings directly.
- Require superadmin approval when an owner wants to cancel a booking.
- Detect owners in the Telegram Mini App by `telegram_id`.
- Add a separate owner password login before entering the owner admin area.
- Move the backend database from SQLite to PostgreSQL in Docker.

## Non-Goals

- No SQLite-to-PostgreSQL data migration.
- No Telegram push notifications in the first implementation.
- No separate precomputed stats table for the first implementation.
- No automatic owner self-registration. Superadmin creates owners.

## Roles And Access

`user` can use the public app and booking flow.

`owner` is created by superadmin with a Telegram ID, login, and temporary password. The owner can access the public Mini App flow and the owner admin area after password login.

`admin` keeps existing admin privileges where applicable.

`superadmin` can create owners, review moderation requests, approve or reject owner changes, and approve or reject owner booking cancellation requests.

## PostgreSQL And Docker

`docker-compose.yml` will include a PostgreSQL service. The backend will use a PostgreSQL `DATABASE_URL`, for example `postgresql+psycopg://andijan:andijan@postgres:5432/andijan_futbol` inside Docker.

Backend dependencies will include a PostgreSQL driver. SQLite-specific connection arguments will be removed from SQLAlchemy engine creation when PostgreSQL is used.

`seed.py` will create the first superadmin, test owners, and test stadium data in PostgreSQL.

## Data Model

### Users

`UserRole` gets a new `owner` role.

Owner users include:

- `telegram_id` for Mini App recognition.
- `owner_login` for owner admin login.
- `hashed_password` for password authentication.
- `must_change_password` to force temporary password replacement on first login.

### Stadiums

`stadiums` gets `owner_id`, linked to `users.id`.

Public stadium rows only contain approved data. A new stadium created by an owner does not appear publicly until superadmin approval.

### Stadium Drafts

`stadium_drafts` stores owner-created or owner-edited stadium data before approval.

Important fields:

- `id`
- `owner_id`
- `stadium_id`, nullable for new stadium creation
- `draft_type`: `create` or `update`
- `status`: `pending`, `approved`, or `rejected`
- Stadium fields such as name, address, prices, work hours, amenities, coordinates, and contact data
- `reviewed_by`
- `review_note`
- `created_at`, `updated_at`, `reviewed_at`

When a draft is approved, the backend applies the draft to `stadiums`. When rejected, public data remains unchanged and the owner sees the rejection reason.

### Stadium Image Drafts

`stadium_image_drafts` stores pending image operations.

Important fields:

- `id`
- `owner_id`
- `stadium_id`
- `action`: `add`, `delete`, or `set_cover`
- `image_url`
- `status`: `pending`, `approved`, or `rejected`
- `reviewed_by`
- `review_note`
- timestamps

Public `cover_image` and `images` change only after superadmin approval.

### Booking Cancellation Requests

`booking_cancel_requests` stores owner requests to cancel bookings.

Important fields:

- `id`
- `booking_id`
- `owner_id`
- `reason`
- `status`: `pending`, `approved`, or `rejected`
- `reviewed_by`
- `review_note`
- timestamps

When approved, the booking status becomes `cancelled`. When rejected, the booking status remains unchanged.

## Backend API

### Auth

- `POST /auth/owner-login`: owner login with owner login and password.
- `POST /auth/owner-change-password`: change temporary password.
- Existing Telegram auth continues to identify Mini App users by `telegram_id`.

### Owner APIs

- `GET /owner/me`: return current owner profile and password-change state.
- `GET /owner/stats`: dashboard stats computed from bookings and stadiums.
- `GET /owner/stadium-drafts`: owner moderation history.
- `POST /owner/stadium-drafts`: create a draft for a new stadium.
- `PUT /owner/stadium-drafts/{id}`: edit a rejected or unsubmitted draft.
- `POST /owner/stadium-drafts/{id}/submit`: submit draft for superadmin review.
- `POST /owner/stadiums/{id}/draft`: create an update draft for an existing owned stadium.
- `POST /owner/stadiums/{id}/image-drafts`: submit image add/delete/cover operations.
- `GET /owner/bookings`: bookings for owner stadiums with filters by date, stadium, and status.
- `PATCH /owner/bookings/{id}/confirm`: confirm a pending booking immediately.
- `POST /owner/bookings/{id}/cancel-request`: request booking cancellation.
- `GET /owner/customers`: list users who booked owner stadiums.
- `GET /owner/notifications`: in-panel notification list.

Owner APIs must only return data for stadiums owned by the current owner.

### Superadmin APIs

- `GET /admin/owners`: list owners.
- `POST /admin/owners`: create owner with Telegram ID, login, and temporary password.
- `PATCH /admin/owners/{id}`: update owner details or active status.
- `GET /admin/moderation/stadium-drafts`: list stadium create/update requests.
- `POST /admin/moderation/stadium-drafts/{id}/approve`: approve and apply draft.
- `POST /admin/moderation/stadium-drafts/{id}/reject`: reject with reason.
- `GET /admin/moderation/image-drafts`: list image requests.
- `POST /admin/moderation/image-drafts/{id}/approve`: approve and apply image operation.
- `POST /admin/moderation/image-drafts/{id}/reject`: reject with reason.
- `GET /admin/moderation/cancel-requests`: list booking cancellation requests.
- `POST /admin/moderation/cancel-requests/{id}/approve`: approve and cancel booking.
- `POST /admin/moderation/cancel-requests/{id}/reject`: reject with reason.

Superadmin APIs require `superadmin` role.

## Frontend Pages

### Mini App Entry

When a Mini App user has an owner role and matching `telegram_id`, the Mini App shows two actions:

- `Foydalanuvchi sifatida ko'rish`
- `Owner kabinet`

`Owner kabinet` opens the owner login screen.

### Owner Area

- `/owner/login`
- `/owner/change-password`
- `/owner`
- `/owner/stadiums`
- `/owner/stadiums/new`
- `/owner/stadiums/[id]/edit`
- `/owner/bookings`
- `/owner/moderation`
- `/owner/customers`
- `/owner/notifications`

The owner UI is mobile-first for Telegram Mini App usage, but it should remain usable on desktop.

### Superadmin Area

Existing `/admin` gets:

- `/admin/owners`
- `/admin/moderation/stadiums`
- `/admin/moderation/images`
- `/admin/moderation/cancellations`

## Owner UI Behavior

The owner dashboard shows:

- Today's bookings.
- Pending bookings.
- Monthly revenue.
- Active stadium count.
- Pending moderation count.

The stadium form is split into sections:

- Basic information.
- Address and map coordinates.
- Pricing.
- Work hours and working days.
- Amenities.
- Images.

Submitting the form creates a pending moderation request. The owner sees `Superadmin tasdig'ida` until review.

Booking list supports filtering by date, stadium, and status. Owner can confirm pending bookings directly. Owner can request cancellation only with a reason.

Moderation history shows pending, approved, and rejected requests. Rejected requests display the superadmin reason and can be edited and resubmitted.

Customers are derived from users who booked the owner's stadiums.

Notifications are in-panel records for new bookings and moderation decisions. Telegram push notifications are left for a later feature.

## Error Handling

Owner endpoints return `403` when the current user is not an owner or tries to access another owner's stadium, booking, draft, customer, or notification.

Superadmin endpoints return `403` unless the current user is `superadmin`.

Approval endpoints return `400` when a request is not pending.

Booking cancellation approval verifies that the booking still belongs to the same owner stadium and is still cancellable.

Draft approval runs inside a database transaction so the draft status and public data stay consistent.

## Testing

Backend checks:

- PostgreSQL connection works through Docker.
- Database tables are created.
- Seed creates a superadmin and test owner.
- Ordinary users cannot access owner endpoints.
- Owners cannot access other owners' stadiums, drafts, bookings, or customers.
- Owner stadium edits do not change public data until approved.
- Superadmin approval applies stadium draft data.
- Superadmin rejection leaves public data unchanged and stores review note.
- Owner can confirm pending bookings.
- Owner cancellation creates a request and does not immediately cancel the booking.
- Superadmin cancellation approval changes booking status to `cancelled`.

Frontend checks:

- Owner Mini App entry shows two buttons only for owner users.
- Owner login works and first-login password change is enforced.
- Owner dashboard loads stats.
- Owner can submit a new stadium draft.
- Owner can submit an update draft.
- Owner can upload image draft operations.
- Owner can confirm a booking.
- Owner can request cancellation.
- Superadmin can approve and reject each moderation type.

## Rollout Plan

1. Replace SQLite configuration with PostgreSQL and Docker setup.
2. Add database models and seed updates.
3. Add auth and access-control changes for owner and superadmin workflows.
4. Add owner backend APIs.
5. Add superadmin moderation APIs.
6. Add owner Mini App entry and owner UI pages.
7. Add superadmin owner and moderation pages.
8. Run backend and frontend verification.

## Risks

This is a large feature that touches persistence, authorization, backend APIs, and multiple frontend areas. The safest implementation is staged: PostgreSQL first, then models and APIs, then owner UI, then superadmin moderation UI.

The moderation system must avoid partial writes. Approval operations should be transactional.

The owner role must be checked on every owner endpoint. Filtering only in the frontend is not sufficient.
