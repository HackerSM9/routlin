// =======================================
// CUSTOM MODALS
// =======================================

/**
 * Creates and displays a custom-themed alert modal.
 * @param {string} message - The main message to display in the modal.
 * @param {string} [title='Alert'] - The title of the modal.
 */
export function customAlert(message, title = 'Alert') {
    // Remove any existing modals
    const existingModal = document.getElementById('customModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div id="customModal" class="modal-custom" style="display: flex;">
            <div class="modal-custom-content">
                <div class="modal-custom-inner">
                    <div class="modal-custom-header">${title}</div>
                    <div class="modal-custom-body">${message}</div>
                    <div class="modal-custom-footer">
                        <button id="customModalOk" class="modal-custom-button modal-custom-button-primary">OK</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('customModalOk').addEventListener('click', () => {
        document.getElementById('customModal').remove();
    });

    // Close modal if clicking outside the content
    document.getElementById('customModal').addEventListener('click', (e) => {
        if (e.target.id === 'customModal') {
            e.target.remove();
        }
    });
}

/**
 * Creates and displays a custom-themed confirmation modal.
 * @param {string} message - The main message to display in the modal.
 * @param {string} [title='Confirm'] - The title of the modal.
 * @returns {Promise<boolean>} - A promise that resolves to true if 'OK' is clicked, and false otherwise.
 */
export function customConfirm(message, title = 'Confirm') {
    return new Promise(resolve => {
        // Remove any existing modals
        const existingModal = document.getElementById('customModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="customModal" class="modal-custom" style="display: flex;">
                <div class="modal-custom-content">
                    <div class="modal-custom-inner">
                        <div class="modal-custom-header">${title}</div>
                        <div class="modal-custom-body">${message}</div>
                        <div class="modal-custom-footer">
                            <button id="customModalCancel" class="modal-custom-button modal-custom-button-secondary">Cancel</button>
                            <button id="customModalOk" class="modal-custom-button modal-custom-button-primary">OK</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const closeModal = (resolution) => {
            document.getElementById('customModal').remove();
            resolve(resolution);
        };

        document.getElementById('customModalOk').addEventListener('click', () => closeModal(true));
        document.getElementById('customModalCancel').addEventListener('click', () => closeModal(false));

        // Close modal if clicking outside the content
        document.getElementById('customModal').addEventListener('click', (e) => {
            if (e.target.id === 'customModal') {
                closeModal(false);
            }
        });
    });
}
