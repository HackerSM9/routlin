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
 * Triggers a strong vibration pattern for creating or deleting an account.
 */
export function vibrateDeleteAccount() {
    if (navigator.vibrate) {
        navigator.vibrate(200); // A single strong vibration
    }
}

/**
 * Triggers a light vibration pattern for tab changes.
 */
export function vibrateTabChange() {
    if (navigator.vibrate) {
        navigator.vibrate(20); // A very short 20ms vibration
    }
}
