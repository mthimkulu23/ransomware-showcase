# backend/app.py
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import secrets
import os
import glob
import shutil

# --- Configuration ---
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))
TARGET_FILES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'target_files'))

os.makedirs(TARGET_FILES_DIR, exist_ok=True)

app = Flask(
    __name__,
    template_folder=frontend_dir,
    static_folder=frontend_dir,
    static_url_path='/'
)
CORS(app)

# The "decryption key" for our simulation (can be updated by generate-key endpoint)
# This key will be stored on the backend and only revealed after simulated payment.
SIMULATION_DECRYPTION_KEY = "SECUREKEY123" # Initial key for first run

# A simple, fixed key byte for XOR "encryption" for demonstration.
# This is NOT secure encryption and is for simulation only.
XOR_KEY_BYTE = 0xAA # Arbitrary byte value for reversible manipulation

# The "ransom note" content
RANSOM_NOTE_CONTENT = """
!!! YOUR FILES HAVE BEEN ENCRYPTED !!!

All your important files (documents, photos, databases, etc.) have been encrypted
with a simple, reversible algorithm. Without the unique decryption key, your files
are inaccessible.

To recover your files, you must pay 1 Bitcoin to the following address:
1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa

Once payment is confirmed, send an email to decrypt.me@example.com with your
payment transaction ID. You will then receive your decryption key.

DO NOT try to decrypt the files yourself or use third-party tools, as this may
lead to permanent data loss.

You have 48 hours. After this time, the decryption key will be destroyed, and
your files will be lost forever.

Good luck.
"""

# --- Helper Functions for File Manipulation ---

def create_dummy_files():
    """
    Creates initial dummy files in the TARGET_FILES_DIR.
    This function ensures we always have files to 'encrypt'.
    """
    dummy_file_contents = {
        "document.txt": "This is a very important document that contains sensitive information.",
        "image.jpg": "Fake image data: JPEG_START_MARKER...[binary_data]...JPEG_END_MARKER",
        "spreadsheet.xlsx": "Financial data: Income, Expenses, Profit, Q1, Q2, Q3, Q4.",
        "presentation.pptx": "Project presentation: Introduction, Methodology, Results, Conclusion."
    }
    for filename, content in dummy_file_contents.items():
        file_path = os.path.join(TARGET_FILES_DIR, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

def get_current_simulated_files():
    """
    Scans the TARGET_FILES_DIR and returns a list of files with their status.
    """
    files_info = []
    all_items = os.listdir(TARGET_FILES_DIR)
    for item in all_items:
        full_path = os.path.join(TARGET_FILES_DIR, item)
        if os.path.isfile(full_path):
            is_encrypted = item.endswith(".locked")
            original_name = item.replace(".locked", "") if is_encrypted else item
            files_info.append({
                "name": original_name,
                "display_name": item, # Name as it appears in the directory
                "encrypted": is_encrypted
            })
    files_info.sort(key=lambda x: x['display_name'].lower())
    return files_info

def xor_bytes(data_bytes, key_byte):
    """
    Performs a simple XOR operation on each byte of data.
    This is a reversible, non-cryptographic "encryption" for simulation.
    """
    return bytes(byte ^ key_byte for byte in data_bytes)

# --- Initialize Dummy Files on App Start (if none exist) ---
if not get_current_simulated_files():
    create_dummy_files()

# --- API Endpoints ---

@app.route('/')
def page_reloading():
    """
    Serves the index.html page from the frontend directory.
    """
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    """
    Returns the current status of the simulated files and the ransom note.
    """
    file_statuses = get_current_simulated_files()
    # Determine if any files are currently 'encrypted' to show ransom note
    current_ransom_note = RANSOM_NOTE_CONTENT if any(f["encrypted"] for f in file_statuses) else ""
    return jsonify({
        "files": file_statuses,
        "ransom_note": current_ransom_note
    })

@app.route('/api/simulate-encrypt', methods=['POST'])
def simulate_encrypt():
    """
    Simulates the encryption of files in TARGET_FILES_DIR.
    Reads file content, applies a simple XOR, overwrites, and renames.
    """
    global SIMULATION_DECRYPTION_KEY # Ensure this is accessible if needed, though not directly modified here
    files_to_encrypt = get_current_simulated_files()
    encrypted_count = 0
    for file_info in files_to_encrypt:
        if not file_info["encrypted"]:
            original_full_path = os.path.join(TARGET_FILES_DIR, file_info["display_name"])
            locked_full_path = os.path.join(TARGET_FILES_DIR, f"{file_info['display_name']}.locked")

            try:
                with open(original_full_path, 'rb') as f_read:
                    original_content = f_read.read()

                encrypted_content = xor_bytes(original_content, XOR_KEY_BYTE)

                with open(original_full_path, 'wb') as f_write:
                    f_write.write(encrypted_content)

                os.rename(original_full_path, locked_full_path)
                encrypted_count += 1
            except Exception as e:
                print(f"Error encrypting file {file_info['display_name']}: {e}")

    if encrypted_count > 0:
        return jsonify({
            "success": True,
            "message": f"Successfully 'encrypted' {encrypted_count} simulated files.",
            "ransom_note": RANSOM_NOTE_CONTENT
        })
    else:
        return jsonify({
            "success": False,
            "message": "No files to 'encrypt' or all are already 'encrypted'."
        })

@app.route('/api/simulate-decrypt', methods=['POST'])
def simulate_decrypt():
    """
    Simulates the decryption of files.
    Checks if the provided key matches the simulation key.
    """
    data = request.get_json()
    key = data.get('key')

    if not key:
        return jsonify({"success": False, "message": "Decryption key is required."}), 400

    global SIMULATION_DECRYPTION_KEY # Declare global to modify the key

    if key == SIMULATION_DECRYPTION_KEY:
        files_to_decrypt = get_current_simulated_files()
        decrypted_count = 0
        for file_info in files_to_decrypt:
            if file_info["encrypted"]:
                locked_full_path = os.path.join(TARGET_FILES_DIR, file_info["display_name"])
                original_full_path = os.path.join(TARGET_FILES_DIR, file_info["name"])

                try:
                    with open(locked_full_path, 'rb') as f_read:
                        encrypted_content = f_read.read()

                    decrypted_content = xor_bytes(encrypted_content, XOR_KEY_BYTE)

                    with open(locked_full_path, 'wb') as f_write:
                        f_write.write(decrypted_content)

                    os.rename(locked_full_path, original_full_path)
                    decrypted_count += 1
                except Exception as e:
                    print(f"Error decrypting file {file_info['display_name']}: {e}")

        if decrypted_count > 0:
            return jsonify({
                "success": True,
                "message": f"Successfully 'decrypted' {decrypted_count} simulated files. All clear!",
                "ransom_note": ""
            })
        else:
            return jsonify({
                "success": False,
                "message": "No files to 'decrypt' or all are already 'unlocked'."
            })
    else:
        return jsonify({"success": False, "message": "Incorrect decryption key. Please try again."})

@app.route('/api/generate-key', methods=['POST'])
def generate_new_key():
    """
    Generates a new random decryption key for simulation purposes.
    This simulates the attacker generating a new key.
    The key is NOT returned to the frontend here.
    """
    global SIMULATION_DECRYPTION_KEY
    new_key = secrets.token_urlsafe(16)
    SIMULATION_DECRYPTION_KEY = new_key

    return jsonify({
        "success": True,
        "message": "New decryption key generated (attacker's side)."
    })

@app.route('/api/reveal-key', methods=['POST'])
def reveal_key():
    """
    Simulates the release of the decryption key after 'payment'.
    Returns the currently active SIMULATION_DECRYPTION_KEY.
    """
    global SIMULATION_DECRYPTION_KEY
    return jsonify({
        "success": True,
        "message": "Decryption key revealed.",
        "decryption_key": SIMULATION_DECRYPTION_KEY
    })


@app.route('/api/reset-files', methods=['POST'])
def reset_simulated_files():
    try:
        for filename in os.listdir(TARGET_FILES_DIR):
            file_path = os.path.join(TARGET_FILES_DIR, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
        create_dummy_files()
        return jsonify({"success": True, "message": "Simulated files reset successfully."})
    except Exception as e:
        print(f"Error resetting files: {e}")
        return jsonify({"success": False, "message": f"Failed to reset simulated files: {e}"}), 500

# --- Main Execution ---
if __name__ == '__main__':
    app.run(debug=True)
