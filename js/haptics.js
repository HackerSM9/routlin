// Haptic feedback functions

/**
 * Triggers a standard vibration pattern for login/logout.
 */
export function vibrateLogin() {
    if (navigator.vibrate) {
        navigator.vibrate(100); // A single 100ms vibration
    }
}

/**
 * Triggers a strong vibration pattern for deleting an account.
 */
export function vibrateDeleteAccount() {
    if (navigator.vibrate) {
        navigator.vibrate([200, 50, 200]); // Two strong vibrations with a short pause
    }
}

/**
 * Triggers a light vibration pattern for tab changes.
 */
export function vibrateTabChange() {
    if (navigator.vibrate) {
        navigator.vibrate(50); // A short 50ms vibration
    }
}
