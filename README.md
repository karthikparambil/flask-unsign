# Flask Unsign Decoder


## 📌 Overview

In Python **Flask** applications, default session cookies are stored client-side. Instead of encrypting the payload, Flask signs the session data using the `itsdangerous` library with a server-side `SECRET_KEY`.

Without the `SECRET_KEY`, any user can **decode and inspect** the raw session data stored in the cookie (such as user IDs, roles, and permissions). If the server relies on a weak or default `SECRET_KEY`, an attacker can **brute-force the secret key**, modify the session payload (e.g. changing `user_id` or setting `admin: true`), and **forge a valid cryptographic signature**.

**Flask Unsign Decoder** provides a sleek web interface and command-line tool to streamline this entire process for penetration testers, security auditors, and CTF players.

---

##  Features

-  **Session Decoding**: Instant deserialization of Flask session cookies (handling URL-safe Base64, timestamp tags, and Zlib decompression).
-  **Zlib Decompression Support**: Automatically detects and decompresses Zlib-compressed Flask session cookies (cookies starting with `.`).
-  **Modern Web UI**: Interactive dashboard hosted live at [flask-unsign.vercel.app](https://flask-unsign.vercel.app/).
-  **Developer & Auditor Friendly**: Built for security research, VAPT engagements, and Capture The Flag (CTF) challenges.

---

## 🧠 How Flask Session Cookies Work

A standard Flask session cookie consists of up to three period-separated (`.`) base64 components:

$$\text{Cookie} = \underbrace{\text{Payload}}_{\text{Base64 / Zlib}} ~.~ \underbrace{\text{Timestamp}}_{\text{Optional Epoch}} ~.~ \underbrace{\text{Signature}}_{\text{HMAC-SHA1 / SHA256}}$$

1. **Payload**: Base64-encoded JSON string (prefixed with `.` if Zlib compressed).
2. **Timestamp**: Base64-encoded timestamp marking when the cookie was generated.
3. **Signature**: Cryptographic HMAC signature calculated using the app's `SECRET_KEY`.

> ⚠️ **Key Security Takeaway**: Flask session cookies are **signed, not encrypted**. Anyone can read the cookie payload without needing the secret key!

---


## 📄 License

Distributed under the MIT License. See `LICENSE` for details.

