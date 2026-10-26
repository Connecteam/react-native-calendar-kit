# Connecteam fork

Fork of [`@howljs/calendar-kit`](https://github.com/howljs/react-native-calendar-kit) **2.5.6**. The mobile app (mobiapp) uses it for the user and admin shift calendars. Before this fork, the app carried a 2,300-line `patch-package` patch on top of 2.2.2.

The `connecteam-main` branch holds only the package (`packages/react-native-calendar-kit` of the upstream monorepo, split out with upstream's history). `main` is upstream's monorepo, left as GitHub forked it. mobiapp installs `connecteam-main` from git:

```json
"@howljs/calendar-kit": "git+https://github.com/Connecteam/react-native-calendar-kit.git#<commit>"
```

`lib/` is committed, so installing needs no build step. Metro reads `src/` (`react-native` field). Jest reads `lib/commonjs`, and TypeScript reads `lib/typescript`.

## What differs from upstream 2.5.6

- **Drag and scroll gestures** (CT-60743, CT-63237)
  - A drag on the selected event is claimed from the UI thread on touch-down.
  - A release/cancel tracker always ends a drag. Interrupted drags reset instead of saving.
  - A drag finishes in one batched commit.
  - Unclaimed drag pans give up only after 12pt of travel.
  - `Gesture.Manual` is replaced by a long press that never fires.
  - `RefreshControl` comes from gesture-handler.
  - There is no `activateAfterLongPress` on Android.
- **`DraggableEvent`** is laid out from `selectedEvent` and hidden through React state, so selecting and releasing don't blink.
- **RTL** (CT-44015): `CalendarList` shows the day bar and the grid right to left. iOS mirrors them; Android lays the pages out in reverse and converts the scroll offset (`utils/rtlOffset`), so nothing is drawn flipped. Taps and horizontal drags map back to the right day.
- **`onLongPressEvent`** also receives the gesture event (CT-63196).
- **Pinch to zoom** keeps the row under the fingers in place. `isPinching` is on the calendar context. On Android the scroll views run alongside the pinch and stop scrolling while it's active.
- **`CalendarList`'s `contentOffset`** follows the list's position, since Android re-applies it on every prop update.
- **`renderEvent`** gets a third argument, `EventStaticSize`, the event's settled plain size. `SizeAnimation` values follow it once a pinch settles.
- **`onEventsRendered` / `onEventsUnmounted`** report the days each page shows. `EventsProvider` packs the whole span of the `events` prop.
- The per-event day walk uses native `Date` instead of luxon.

Each change is its own commit on top of `chore: release 2.5.6`, and each commit says why.

## Changing the fork

1. Edit `src/`.
2. Rebuild `lib/`:
   ```bash
   scripts/build-lib.sh <upstream-clone> <mobiapp-checkout>
   ```
3. Commit `src/` and `lib/` together, push, and bump the commit in mobiapp's `package.json`.

## Taking a newer upstream release

Split the new upstream tag the same way, then merge it into this branch:

```bash
git -C <upstream-clone> subtree split --prefix packages/react-native-calendar-kit <tag> -b upstream-<tag>
git fetch <upstream-clone> upstream-<tag>
git merge FETCH_HEAD
```

Before resolving conflicts, check whether upstream now covers any change listed above, and drop it if so. Then rebuild `lib/`.
