"""Generate a bcrypt hash for the AUTH_PASSWORD_HASH env var.

Usage:
    python -m app.cli.hash_password
"""

import getpass

from app.auth.password import hash_password


def main() -> None:
    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm:  ")
    if password != confirm:
        print("Passwords do not match.")
        raise SystemExit(1)
    print(hash_password(password))


if __name__ == "__main__":
    main()
