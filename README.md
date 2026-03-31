# Hangout.

> **Stop letting the group chat kill your plans.**
> Hangout is a mobile app that covers the full lifecycle of planning a casual hangout — from "we should hang out" to a confirmed event with everyone's availability, food assignments, and logistics in one place.

---

## Table of Contents

- [What It Is](#what-it-is)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Screens](#screens)
- [What's Built](#whats-built)
- [To Do](#to-do)
- [Running the App](#running-the-app)
- [Team](#team)

---

## What It Is

Hangout solves the coordination problem that kills most hangout plans. Instead of a 3-day group chat back-and-forth that goes nowhere, Hangout gives friend groups:

- A shared calendar where everyone marks their busy times
- An automatic "best night" suggestion based on group availability
- A collaborative event details page where anyone can claim food, set the vibe, add location and parking, and more
- A nudge system that reminds you when it's been too long since you've hung out

**Target users:** Whoever coordinates group hangouts regularly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 54) |
| Router | Expo Router (file-based) |
| Language | TypeScript |
| Backend | Supabase (PostgreSQL + real-time) |
| Testing | Expo Go (iOS) |
| Version Control | Git + GitHub |

**Key architectural decisions:**
- `newArchEnabled: false` in `app.json` — required to prevent black screen on Expo Go. Do not change this.
- `newArchEnabled` warning in Expo Go is expected and harmless — ignore it.

---

## Project Structure

```
# Screens users navigate to
app/
├── (auth)/
│   ├── _layout.tsx             # Auth page config
│   ├── login.tsx               # Login page
│   ├── signup.tsx              # Signup page
├── (tabs)/
│   ├── _layout.tsx             # Tab bar config (Home, Schedule, Hangouts)
│   ├── index.tsx               # Home screen
│   ├── schedule.tsx            # Schedule screen (monthly + weekly views)
│   └── hangouts.tsx            # Hangouts list + create + full event detail
├── _layout.tsx                 # Root stack layout
├── modal.tsx                   # Modal stub
├── settings.tsx                # Settings screen
├── nudgeFrequency.tsx          # Nudge frequency settings screen
└── calendarSync.tsx            # Calendar sync screen (Apple Calendar + CSV)

# Reusable UI
components/
├── HangoutHeader.tsx           # Shared header (logo + gear/settings icon)
├── LocationAutoComplete.tsx    # Google Places autocomplete input
├── InviteSection.tsx           # Invite users by username or from friends list
└── CalendarSync.tsx            # Apple Calendar + CSV import logic and UI

constants/
├── mockData.ts                 # Mock friends, nudge, current user data
└── theme.ts                    # Shared theme tokens

# API/Client setup
lib/
├── supabase.ts                 # Supabase client
└── googleMaps.ts               # Google Maps API client

# Database or network logic
services/
├── eventService.ts             # Get events from current user via userId
└── nudgeService.ts             # Read/write nudge preferences, register push tokens

# Auth
providers/
└── AuthProvider.tsx            # Manages auth state via Supabase

# Supabase Edge Functions
supabase/
└── functions/
    └── send-nudges/
        └── index.ts            # Daily cron — sends push notifications for overdue hangouts
```

---

## Screens

### Home (`index.tsx`)
- Greeting by time of day using authenticated username
- Nudge card: "It's been X days since hanging with [Name]" → Plan something button → navigates to Schedule
- Recent hangouts list with overdue/soon badges

### Schedule (`schedule.tsx`)
- **Monthly view:** tap a date to mark unavailable all day; 24-hour grid panel slides in below to customize specific busy hours; past dates are automatically dimmed and blocked
- **Weekly view:** drag-to-paint busy hours across a 7-day grid with time labels; drag mode toggled via banner; friend availability shown as colored pips
- Best night banner: auto-detects best available date based on friend busy days; "Lock it in →" navigates to Hangouts
- Shared state: `dayMap` (`Record<string, { state, busyHours }>`) holds all availability

### Hangouts (`hangouts.tsx`)
- **List view:** all hangouts the user is a member of, loaded live from Supabase with attendee counts and confirmed status
- **Create view:** emoji picker, hangout name, native date calendar picker, native time scroll wheel; saves group + event + memberships to Supabase in one flow
- **Detail view:** full event detail loaded live from Supabase
  - Countdown banner (days until event)
  - Who's coming (attendee chips with real usernames + RSVP status)
  - Invite section (search by username or select from friends/recent groups)
  - Outfit vibes (selectable chips, persisted to Supabase)
  - Music / playlist link
  - Food & Drinks list (add, claim, remove — all real-time Supabase)
  - Misc supplies list (same as food)
  - Location card with Google Places autocomplete
  - Parking card with Google Places autocomplete + freeform notes
  - Suggestions tab — anyone can submit, organizer can accept or decline
  - Confirm event button (sets confirmed = true in Supabase)
  - Edit mode toggle — all fields become editable, saves on "Save"

### Settings (`settings.tsx`)
- Sections: Account, App, Integrations, Support
- **Nudge Frequency** (APP section) → navigates to nudge frequency screen
- **Calendar Sync** (INTEGRATIONS section) → navigates to calendar sync screen
- **Log Out** button — signs out via Supabase auth
- Accessible from gear icon in HangoutHeader on every screen

### Nudge Frequency (`nudgeFrequency.tsx`)
- Shows all groups the user belongs to
- Per-group frequency selector: Every 3 days / Weekly / Every 2 weeks / Monthly / Never
- Saves preferences to `user_nudge_preferences` table in Supabase

### Calendar Sync (`calendarSync.tsx`)
- **Apple Calendar sync** — requests device calendar permission, reads all events for next 60 days, saves busy blocks to `user_availability` in Supabase
- **CSV import** — pick a Google Calendar or other export file, parses busy times, saves same way

---

## What's Built

- [x] Purple + yellow twilight design system (colors, typography, components)
- [x] Shared `HangoutHeader` component with logo → home navigation and gear → settings
- [x] Home screen with nudge card and recent hangouts list
- [x] Monthly calendar view with tap-to-mark unavailable + 24h hour grid panel
- [x] Past date blocking (silently dimmed, tap ignored)
- [x] Weekly calendar view with drag-to-paint PanResponder (locked, working)
- [x] Best night auto-detection banner
- [x] "Lock it in" navigation from schedule → hangouts
- [x] Tab bar navigation (Home, Schedule, Hangouts)
- [x] `app.json` architectural config locked (`newArchEnabled: false`)
- [x] Finalized logo
- [x] Supabase project and tables (Users, Friends, Groups & Members, Events, Items, Members, Suggestions, Nudge Preferences, Availability)
- [x] User sign-up, log-in, log-out
- [x] Profile page (stats, friends modal, edit mode)
- [x] Username-based greeting system
- [x] Avatar-based hangout previews
- [x] Hangouts list screen with live Supabase data and attendee counts
- [x] Hangout creation — saves group, event, and memberships to Supabase in one flow
- [x] Native date calendar picker + time scroll wheel in create flow
- [x] Full event detail screen loading live from Supabase
- [x] Attendees loaded with real usernames and RSVP status
- [x] Food & drink items — add, claim, unclaim, remove (all Supabase)
- [x] Misc supplies — add, claim, unclaim, remove (all Supabase)
- [x] Suggestions tab — submit, accept, decline (all Supabase via `event_suggestions` table)
- [x] Confirmed event state — persists to Supabase
- [x] Edit mode — all fields editable, saves on "Save"
- [x] Location & parking autocomplete (Google Places)
- [x] Invite section — search by username or select from friends/recent groups
- [x] Nudge frequency settings per group (stored in Supabase)
- [x] Supabase Edge Function for daily push notification nudges
- [x] Apple Calendar sync (reads device calendars, saves busy blocks to Supabase)
- [x] CSV calendar import (parses Google Calendar export format)

---

## To Do

### 🔴 Core / High Priority

**Maps & Location Integration**
Create a map modal that pops up when a user taps an address on the event detail page. Should open the native Maps app (Apple Maps / Google Maps) to navigate to the location. Location and parking fields already store latitude/longitude from Google Places.

**Best Night Algorithm (Real Group Availability)**
The current `getBestNight` in `schedule.tsx` uses a hardcoded `FRIENDS` mock array with day-of-week patterns. Replace with a real query against `user_availability` in Supabase — aggregate busy blocks across all group members and surface the date with the most people free. Account for partial availability (specific hours busy vs all day).

**Friends System (Backend Wiring)**
The `friends` table exists in Supabase but friend requests, acceptance, and the friends list UI are not fully wired. Users can currently appear in the "From Recent Groups" section of the invite flow but a proper add/accept friends flow is needed.

**Notifications & Edit Alerts**
Push notifications for real-time event edit alerts (someone changed the location, claimed a food item, updated parking notes, etc.) via Supabase real-time subscriptions. The nudge notification system is already built — this is specifically for event-level change alerts.

**Real-Time Sync**
Event detail data (food claims, attendee list, suggestions) currently loads once on open. Wire Supabase real-time subscriptions so changes made by other users appear instantly without requiring a manual refresh.

---

### 🟡 Important / Medium Priority

**Google Calendar Integration**
OAuth-based Google Calendar sync. Apple Calendar and CSV import are already done — Google Calendar requires a Google Cloud project with OAuth credentials and is the most-requested missing integration.

**Contacts Sync**
Let users find friends by syncing their contacts. Match on phone number or email against existing Hangout users, with an invite flow for non-users.

**Onboarding Flow**
A first-launch walkthrough: create account → set username → add friends → create first hangout.

**Hangout History / Past Events**
A log of past hangouts per friend/group. Powers the nudge system's "last seen X days ago" with real data instead of mock values.

---

### 🟢 Nice to Have / Future

**Spotify / Apple Music Integration**
Connect to Spotify or Apple Music to attach a real collaborative playlist to the event. The music card would show album art, track count, and a deep link to open the playlist in the music app.

**Recurring Hangouts**
Support for recurring events (e.g. monthly game nights) with carry-over details and attendance history.

**Availability Heatmap**
On the monthly view, show a subtle color gradient across all dates based on how many friends are free — a full picture at a glance rather than just the single best night highlight.

**Dark / Light Mode Toggle**
Currently hardcoded dark. Add a light mode variant and wire it to the Appearance setting.

**Customizable Event Emoji**
Tap the event emoji in the create flow to open a full emoji picker rather than the fixed set of 8 options.

---

## Running the App

```bash
# Install dependencies
npm install

# Start dev server
npx expo start --clear

# Press 'i' for iOS simulator or scan QR with Expo Go on iPhone
```

> **IMPORTANT:** Keep `newArchEnabled: false` in `app.json`. Removing it will cause a black screen in Expo Go.

### Environment Variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `users` | User profiles (id, username, full_name, avatar_url, bio) |
| `friends` | Friend relationships (user_id, friend_id, status) |
| `groups` | Hangout groups (id, name, description, owner_id) |
| `group_members` | Group membership (group_id, user_id) |
| `events` | Hangout events (id, title, start_time, group_id, location, parking, confirmed, etc.) |
| `event_members` | Event attendance (event_id, user_id, role, rsvp_status) |
| `event_items` | Food/misc items (event_id, user_id, category, item_name, status) |
| `event_suggestions` | Suggestions (event_id, user_id, text, status) |
| `user_nudge_preferences` | Per-group nudge frequency (user_id, group_id, frequency_days) |
| `user_availability` | Calendar busy blocks (user_id, date_key, busy_hours, all_day) |
| `push_tokens` | Expo push tokens for notifications (user_id, token) |

---

## Team

| Name |
|---|
| NJ |
| Dylan |
| Lorenzo |

---

## Design Reference

The visual design follows the **Purple + Yellow Twilight** theme. Core tokens:

| Token | Value |
|---|---|
| Background | `#0f0a1f` |
| Secondary bg | `#1a1333` |
| Card | `rgba(30,24,56,0.6)` |
| Gold (primary CTA) | `#facc15` |
| Purple accent | `#8b5cf6` |
| Purple light | `#c4b5fd` |
| Red (busy) | `#ef4444` |
| Green (best night) | `#10b981` |
| Text primary | `#e8e4f3` |
| Text muted | `#a78bfa` |

Fonts: **Outfit** (headings/display) · **DM Sans** (body/UI)