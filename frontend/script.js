// frontend/script.js
document.addEventListener('DOMContentLoaded', () => {
    const simulateEncryptBtn = document.getElementById('simulate-encrypt-btn');
    const simulateDecryptBtn = document.getElementById('simulate-decrypt-btn');
    const decryptionKeyInput = document.getElementById('decryption-key-input');
    const fileListDiv = document.getElementById('file-list');
    const ransomNoteDiv = document.getElementById('ransom-note');
    const messageBox = document.getElementById('message-box');
    const generateKeyBtn = document.getElementById('generate-key-btn');
    const generatedKeyDisplay = document.getElementById('generated-key-display');
    const resetFilesBtn = document.getElementById('reset-files-btn');
    const simulatePaymentBtn = document.getElementById('simulate-payment-btn'); // Reference to the main Simulate Payment button

    // Lockdown Overlay Elements
    const lockdownOverlay = document.getElementById('lockdown-overlay');
    const overlayRansomNote = document.getElementById('overlay-ransom-note');
    const overlayDecryptionKeyInput = document.getElementById('overlay-decryption-key-input');
    const overlaySimulateDecryptBtn = document.getElementById('overlay-simulate-decrypt-btn');
    const overlaySimulatePaymentBtn = document.getElementById('overlay-simulate-payment-btn'); // Reference to the overlay Simulate Payment button
    const overlayMessageBox = document.getElementById('overlay-message-box');

    const API_BASE_URL = 'http://127.0.0.1:5000';

    let isLockedDown = false; // State variable to track lockdown status

    // Initialize generatedKeyDisplay state
    generatedKeyDisplay.classList.add('hidden');
    generatedKeyDisplay.textContent = 'Key will be revealed after simulated payment.';


    // Function to show messages in the main message box
    function showMessage(message, type = 'info') {
        messageBox.textContent = message;
        messageBox.className = `p-4 rounded-md mb-6 text-center`;
        if (type === 'info') {
            messageBox.classList.add('bg-blue-900', 'text-blue-200');
        } else if (type === 'success') {
            messageBox.classList.add('bg-green-900', 'text-green-200');
        } else if (type === 'error') {
            messageBox.classList.add('bg-red-900', 'text-red-200');
        } else if (type === 'warning') {
            messageBox.classList.add('bg-yellow-900', 'text-yellow-200');
        }
        messageBox.classList.remove('hidden');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 5000);
    }

    // Function to show messages in the overlay message box
    function showOverlayMessage(message, type = 'info') {
        overlayMessageBox.textContent = message;
        overlayMessageBox.className = `message-box-overlay`; // Reset classes
        if (type === 'info') {
            overlayMessageBox.classList.add('bg-blue-900', 'text-blue-200');
        } else if (type === 'success') {
            overlayMessageBox.classList.add('bg-green-900', 'text-green-200');
        } else if (type === 'error') {
            overlayMessageBox.classList.add('bg-red-900', 'text-red-200');
        } else if (type === 'warning') {
            overlayMessageBox.classList.add('bg-yellow-900', 'text-yellow-200');
        }
        overlayMessageBox.classList.add('active'); // Show it
        setTimeout(() => {
            overlayMessageBox.classList.remove('active');
        }, 5000);
    }

    // Function to render simulated files
    async function renderFiles() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/status`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            fileListDiv.innerHTML = '';

            if (data.files && data.files.length > 0) {
                data.files.forEach(file => {
                    const fileElement = document.createElement('div');
                    fileElement.className = 'bg-gray-600 p-3 rounded-md flex justify-between items-center';
                    const statusText = file.encrypted ? 'Locked' : 'Unlocked';
                    const statusColor = file.encrypted ? 'text-red-400' : 'text-green-400';
                    fileElement.innerHTML = `
                        <span class="text-gray-300">${file.display_name}</span>
                        <span class="${statusColor} font-medium" data-status="${statusText.toLowerCase()}">${statusText}</span>
                    `;
                    fileListDiv.appendChild(fileElement);
                });
            } else {
                fileListDiv.innerHTML = '<p class="text-gray-400 text-center">No simulated files found. Click "Reset Files" to create them.</p>';
            }

            // Update ransom note in main view
            if (data.ransom_note) {
                ransomNoteDiv.textContent = data.ransom_note;
                // If files are encrypted, activate lockdown overlay
                if (data.files.some(f => f.encrypted)) {
                    activateLockdown(data.ransom_note);
                } else {
                    deactivateLockdown();
                }
            } else {
                ransomNoteDiv.innerHTML = '<p class="text-gray-500">Your files are currently safe. Simulate an attack to see the ransom note.</p>';
                deactivateLockdown(); // Ensure overlay is off if no ransom note
            }

        } catch (error) {
            console.error('Error fetching file status:', error);
            showMessage('Failed to load file status. Is the backend running and target_files directory set up?', 'error');
            deactivateLockdown(); // Ensure overlay is off on error
        }
    }

    // Activate the full-screen lockdown overlay
    function activateLockdown(noteContent) {
        isLockedDown = true;
        lockdownOverlay.classList.add('active');
        overlayRansomNote.textContent = noteContent;
        overlayDecryptionKeyInput.value = ''; // Clear input
        overlayDecryptionKeyInput.focus(); // Focus input for immediate typing
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    // Deactivate the full-screen lockdown overlay
    function deactivateLockdown() {
        isLockedDown = false;
        lockdownOverlay.classList.remove('active');
        document.body.style.overflow = 'auto'; // Re-enable scrolling
        overlayMessageBox.classList.remove('active'); // Hide overlay message box
    }

    // Simulate Encryption
    simulateEncryptBtn.addEventListener('click', async () => {
        simulateEncryptBtn.disabled = true;
        simulateEncryptBtn.textContent = 'Simulating...';
        showMessage('Simulating ransomware attack...', 'info');
        try {
            const response = await fetch(`${API_BASE_URL}/api/simulate-encrypt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            showMessage(data.message, 'success');
            renderFiles(); // Re-render files to show locked status and activate overlay
        } catch (error) {
            console.error('Error during encryption simulation:', error);
            showMessage('Error during encryption simulation. See console for details.', 'error');
        } finally {
            simulateEncryptBtn.disabled = false;
            simulateEncryptBtn.textContent = 'Simulate Ransomware Attack';
        }
    });

    // Simulate Decryption (main view button)
    simulateDecryptBtn.addEventListener('click', async () => {
        const key = decryptionKeyInput.value.trim();
        if (!key) {
            showMessage('Please enter a decryption key.', 'error');
            return;
        }

        simulateDecryptBtn.disabled = true;
        simulateDecryptBtn.textContent = 'Decrypting...';
        showMessage('Attempting decryption...', 'info');

        try {
            const response = await fetch(`${API_BASE_URL}/api/simulate-decrypt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key: key })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                showMessage(data.message, 'success');
                decryptionKeyInput.value = '';
            } else {
                showMessage(data.message, 'error');
            }
            renderFiles(); // Re-render files to show unlocked status and deactivate overlay
        } catch (error) {
            console.error('Error during decryption simulation:', error);
            showMessage('Error during decryption simulation. See console for details.', 'error');
        } finally {
            simulateDecryptBtn.disabled = false;
            simulateDecryptBtn.textContent = 'Simulate Decryption';
        }
    });

    // Simulate Decryption (overlay view button)
    overlaySimulateDecryptBtn.addEventListener('click', async () => {
        const key = overlayDecryptionKeyInput.value.trim();
        if (!key) {
            showOverlayMessage('Please enter a decryption key.', 'error');
            return;
        }

        overlaySimulateDecryptBtn.disabled = true;
        overlaySimulateDecryptBtn.textContent = 'Decrypting...';
        showOverlayMessage('Attempting decryption...', 'info');

        try {
            const response = await fetch(`${API_BASE_URL}/api/simulate-decrypt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key: key })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                showOverlayMessage(data.message, 'success');
                overlayDecryptionKeyInput.value = '';
                // Give a moment for the message to be seen before deactivating
                setTimeout(() => {
                    deactivateLockdown();
                    renderFiles(); // Re-render files to show unlocked status
                }, 1000);
            } else {
                showOverlayMessage(data.message, 'error');
            }
        } catch (error) {
            console.error('Error during overlay decryption simulation:', error);
            showOverlayMessage('Error during decryption simulation. See console for details.', 'error');
        } finally {
            overlaySimulateDecryptBtn.disabled = false;
            overlaySimulateDecryptBtn.textContent = 'Decrypt Files';
        }
    });


    // Event listener for Generate New Key button (Attacker Side)
    if (generateKeyBtn) {
        generateKeyBtn.addEventListener('click', async () => {
            generateKeyBtn.disabled = true;
            generateKeyBtn.textContent = 'Generating...';
            generatedKeyDisplay.textContent = 'Generating new key...'; // Update display
            generatedKeyDisplay.classList.remove('hidden'); // Show while generating
            showMessage('Generating new decryption key (attacker side)...', 'info');

            try {
                const response = await fetch(`${API_BASE_URL}/api/generate-key`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data.success) {
                    // Key is generated on backend, but not displayed here immediately
                    generatedKeyDisplay.textContent = 'New key generated on backend. (Not revealed yet)';
                    showMessage(data.message, 'success');
                } else {
                    showMessage(data.message || 'Failed to generate new key.', 'error');
                    generatedKeyDisplay.textContent = 'Failed to generate key.';
                }
            } catch (error) {
                console.error('Error during key generation:', error);
                showMessage('Error generating key. See console for details.', 'error');
                generatedKeyDisplay.textContent = 'Error generating key.';
            } finally {
                generateKeyBtn.disabled = false;
                generateKeyBtn.textContent = 'Generate New Decryption Key (Attacker Side)';
            }
        });
    }

    // Event listener for Simulate Payment & Get Key button (Main view)
    if (simulatePaymentBtn) {
        simulatePaymentBtn.addEventListener('click', async () => {
            simulatePaymentBtn.disabled = true;
            simulatePaymentBtn.textContent = 'Processing Payment...';
            generatedKeyDisplay.textContent = 'Requesting key...';
            generatedKeyDisplay.classList.remove('hidden'); // Ensure it's visible
            showMessage('Simulating payment and requesting decryption key...', 'info');

            try {
                const response = await fetch(`${API_BASE_URL}/api/reveal-key`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data.success && data.decryption_key) {
                    generatedKeyDisplay.textContent = `Decryption Key: ${data.decryption_key}`;
                    showMessage(data.message, 'success');
                } else {
                    showMessage(data.message || 'Failed to get decryption key.', 'error');
                    generatedKeyDisplay.textContent = 'Failed to get key.';
                }
            } catch (error) {
                console.error('Error revealing key:', error);
                showMessage('Error getting key. See console for details.', 'error');
                generatedKeyDisplay.textContent = 'Error getting key.';
            } finally {
                simulatePaymentBtn.disabled = false;
                simulatePaymentBtn.textContent = 'Simulate Payment & Get Key';
            }
        });
    }

    // Event listener for Simulate Payment & Get Key button (Overlay view)
    if (overlaySimulatePaymentBtn) {
        overlaySimulatePaymentBtn.addEventListener('click', async () => {
            overlaySimulatePaymentBtn.disabled = true;
            overlaySimulatePaymentBtn.textContent = 'Processing Payment...';
            showOverlayMessage('Simulating payment and requesting decryption key...', 'info');

            try {
                const response = await fetch(`${API_BASE_URL}/api/reveal-key`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data.success && data.decryption_key) {
                    overlayDecryptionKeyInput.value = data.decryption_key; // Auto-fill key
                    showOverlayMessage(`Key obtained: ${data.decryption_key}. Now click Decrypt Files.`, 'success');
                } else {
                    showOverlayMessage(data.message || 'Failed to get decryption key.', 'error');
                }
            } catch (error) {
                console.error('Error revealing key from overlay:', error);
                showOverlayMessage('Error getting key. See console for details.', 'error');
            } finally {
                overlaySimulatePaymentBtn.disabled = false;
                overlaySimulatePaymentBtn.textContent = 'Simulate Payment & Get Key';
            }
        });
    }


    // Event listener for Reset Files button
    if (resetFilesBtn) {
        resetFilesBtn.addEventListener('click', async () => {
            resetFilesBtn.disabled = true;
            resetFilesBtn.textContent = 'Resetting...';
            showMessage('Resetting simulated files...', 'info');
            try {
                const response = await fetch(`${API_BASE_URL}/api/reset-files`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                showMessage(data.message, 'success');
                // Reset key display as well
                generatedKeyDisplay.textContent = 'Key will be revealed after simulated payment.'; // Reset text
                generatedKeyDisplay.classList.add('hidden'); // Hide it again
                renderFiles();
            } catch (error) {
                console.error('Error during file reset:', error);
                showMessage('Error resetting files. See console for details.', 'error');
            } finally {
                resetFilesBtn.disabled = false;
                resetFilesBtn.textContent = 'Reset Simulated Files';
            }
        });
    }

    // Keyboard and Mouse Event Listeners for Lockdown
    document.addEventListener('keydown', (e) => {
        if (isLockedDown) {
            if (e.key === 'Tab') {
                e.preventDefault();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
            }
        }
    });

    document.addEventListener('contextmenu', (e) => {
        if (isLockedDown) {
            e.preventDefault();
        }
    });

    // Initial render of files when the page loads
    renderFiles();
});
