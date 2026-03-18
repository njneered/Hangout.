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
app/
├── (tabs)/
│   ├── _layout.tsx        # Tab bar config (Home, Schedule, Event)
│   ├── index.tsx          # Home screen
│   ├── schedule.tsx       # Schedule screen (monthly + weekly views)
│   └── event.tsx          # Event details screen
├── _layout.tsx            # Root stack layout (declares settings route)
├── modal.tsx              # Modal stub
└── settings.tsx           # Settings screen

components/
└── HangoutHeader.tsx      # Shared header (logo + gear/settings icon)

constants/
├── mockData.ts            # Mock friends, nudge, current user data
└── theme.ts               # Shared theme tokens (if extracted)

lib/
├── supabase.ts            # Supabase API Connect
└── googleMaps.ts          # GoogleMaps API Connect

services/
└── eventService.ts        # Get events from current user via userId
```

---

## Screens

### Home (`index.tsx`)
- Greeting by time of day
- Nudge card: "It's been X days since hanging with [Name]" → Plan something button → navigates to Schedule
- Recent hangouts list with overdue/soon badges

### Schedule (`schedule.tsx`)
- **Monthly view:** tap a date to mark unavailable all day; 24-hour grid panel slides in below to customize specific busy hours; past dates are automatically dimmed and blocked
- **Weekly view:** drag-to-paint busy hours across a 7-day grid with time labels; drag mode toggled via banner; friend availability shown as colored pips
- Best night banner: auto-detects best available date based on friend busy days; "Lock it in →" navigates to Event details
- Shared state: `dayMap` (`Record<string, { state, busyHours }>`) holds all availability

### Event Details (`event.tsx`)
- Countdown banner (days until event)
- Who's coming (attendee chips)
- Outfit vibes (selectable chips)
- Music / playlist link
- Food & Drinks list (add, claim, remove)
- Misc supplies list — separate from food (add, claim, remove)
- Location card (name + address)
- Parking card (location + freeform notes)
- Confirm event button
- Edit mode toggle — all fields become editable inputs when active

### Settings (`settings.tsx`)
- Stub settings page with sections: Account, App, Integrations, Support
- Accessible from gear icon in `HangoutHeader` on every screen

---

## What's Built

- [x] Purple + yellow twilight design system (colors, typography, components)
- [x] Shared `HangoutHeader` component with logo → home navigation and gear → settings
- [x] Home screen with nudge card and recent hangouts list
- [x] Monthly calendar view with tap-to-mark unavailable + 24h hour grid panel
- [x] Past date blocking (silently dimmed, tap ignored)
- [x] Weekly calendar view with drag-to-paint PanResponder (locked, working)
- [x] Best night auto-detection banner
- [x] "Lock it in" navigation from schedule → event details
- [x] Event details page with all sections (food, misc, location, parking, vibes, music, attendees)
- [x] Edit mode toggle (pencil icon) on event details
- [x] Claim/unclaim items on food and misc lists
- [x] Add/remove items on food and misc lists
- [x] Stub settings screen
- [x] Tab bar navigation (Home, Schedule, Event)
- [x] `app.json` architectural config locked (`newArchEnabled: false`)\
- [x] Finalized logo! YAY

---

## To Do

### 🔴 Core / High Priority

**Maps & Location Integration**
Wire the location and parking fields to a maps API (Google Places or Apple Maps). When a user types in the location field, suggestions should pop up. Once selected, the address auto-fills and a map preview renders below the location card inside the event details page.

**Event Tabs System**
The Event tab currently shows a single hardcoded event. This needs to support multiple events — each with its own tab or card. Tapping an event card opens that event's full details page. This requires a proper data model and navigation structure (likely a dynamic route like `app/(tabs)/event/[id].tsx`).

**Create a Group**
Users need to be able to create a friend group, invite members, and have that group's availability aggregated on the schedule screen. The current `FRIENDS` mock array needs to become real Supabase data tied to the authenticated user.

**Profile / Username**
Implement user profiles with a username, display name, and avatar. This feeds into who's coming on event pages, the nudge system, and group membership.

**Notifications & Edit Alerts**
Push notifications for: (1) nudge reminders when it's been too long since a hangout, (2) real-time alerts whenever someone edits the event details page (changed location, claimed a food item, updated parking notes, etc.). Supabase real-time subscriptions are the right approach here.

**Nudge Frequency Settings**
Wire up the "Nudge Frequency" setting in the settings screen so users can customize how often they get reminded per friend/group. Store preference in Supabase per user.

**Best Night Algorithm (Real Group Availability)**
The current "best night" detection (getBestNight in schedule.tsx) scores dates by subtracting points for each friend's hardcoded busyDays array — a mock approximation based on day-of-week patterns. This needs to be replaced with a real algorithm that queries actual per-user availability from Supabase (the dayMap data each group member submits), aggregates it across all group members, and surfaces the date where the most people are genuinely free. The algorithm should also account for partial availability (users who marked specific hours busy rather than the full day), weighting dates where conflicts are minor over dates where key people are completely unavailable.


---

### 🟡 Important / Medium Priority

**Calendar Sync**
Allow users to sync external calendars so busy times auto-populate on the schedule screen. Priority order: Google Calendar (OAuth), Outlook, Canvas (iCal URL import). This eliminates manual availability entry for most users.

**Contacts Sync**
Let users find friends by syncing their contacts. Matches on phone number or email against existing Hangout users, with an invite flow for non-users.

**Customizable Event Emoji / Logo**
Each event should have a customizable emoji or icon that appears next to the event title and on the event card/tab. Users can tap it to pick from an emoji picker.



---

### 🟢 Nice to Have / Future

**Spotify / Apple Music Integration**
Connect to Spotify or Apple Music so users can attach a real collaborative playlist to the event. The music card would show album art, track count, and a deep link to open the playlist in the music app. Marked optional — manual playlist link works for now.

**Recurring Hangouts**
Support for recurring events (e.g. monthly game nights) with carry-over details and attendance history.

**Hangout History / Past Events**
A log of past hangouts per friend/group with dates and activities. Powers the nudge system's "last seen X days ago" calculation with real data.

**Availability Heatmap**
On the monthly view, show a subtle color gradient across all dates based on how many friends are free — not just the single best night highlight, but a full picture at a glance.

**Dark / Light Mode Toggle**
Currently hardcoded dark. Add a light mode variant and wire it to the Appearance setting.

**Onboarding Flow**
A first-launch walkthrough: create account → set username → add friends → create first group.

---

## Running the App

```bash
# Install dependencies
npm install

# Start dev server
npx expo start --clear

# Press 'i' for iOS simulator or scan QR with Expo Go on iPhone
```

> SUPER DUPER IMPORTANT OR ELSE!!!!!!!! Keep `newArchEnabled: false` in `app.json`. Removing it will cause a black screen in Expo Go.

---

## Team

| Name |
|---|
| NJ |  |
| Dylan |
| Lorenzo |

---

## Design Reference

The visual design follows the **Purple + Yellow Twilight** (FOR NOW). Core tokens:

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
